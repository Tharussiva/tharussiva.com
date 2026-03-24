// One-time migration script: uploads all images to Sanity and creates project documents.
//
// Before running, you need:
//   1. A Sanity project created at sanity.io/manage
//   2. The schema deployed (see sanity/README.md)
//   3. A write token: sanity.io/manage → your project → API → Tokens → Add API token (Editor role)
//   4. All three values set in your .env file
//
// Run:
//   npm run migrate

import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Sanity client (write mode) ──
const client = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID,
  dataset:   process.env.VITE_SANITY_DATASET || 'production',
  token:     process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// ── Load projects from existing projects.js ──
const projectsCode = fs.readFileSync(path.join(ROOT, 'projects.js'), 'utf8');
// eslint-disable-next-line no-eval
const projects = eval(`${projectsCode}; projects`);

// ── Cache: avoid re-uploading the same image file twice ──
const uploadCache = new Map();

async function uploadImage(src) {
  if (uploadCache.has(src)) {
    return uploadCache.get(src);
  }

  const filePath = path.join(ROOT, src);

  if (!fs.existsSync(filePath)) {
    console.warn(`    ⚠  File not found, skipping: ${src}`);
    return null;
  }

  const filename = path.basename(src);
  process.stdout.write(`    ↑ Uploading: ${filename} ... `);

  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
    filename,
  });

  console.log('done');
  uploadCache.set(src, asset._id);
  return asset._id;
}

// ── Main migration ──
async function migrate() {
  if (!process.env.VITE_SANITY_PROJECT_ID) {
    console.error('❌  VITE_SANITY_PROJECT_ID is not set. Check your .env file.');
    process.exit(1);
  }
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('❌  SANITY_WRITE_TOKEN is not set. Add it to your .env file.');
    process.exit(1);
  }

  console.log(`\n🚀  Migrating ${projects.length} projects to Sanity...\n`);

  let imagesUploaded = 0;
  let videosSkipped  = 0;
  let errors         = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const num = String(i + 1).padStart(2, ' ');
    console.log(`[${num}/${projects.length}]  ${project.title}`);

    const media = [];

    for (let j = 0; j < project.media.length; j++) {
      const item = project.media[j];
      const key  = `item-${i}-${j}`;

      if (item.type === 'image') {
        const assetId = await uploadImage(item.src);
        if (assetId) {
          media.push({
            _type:     'mediaItem',
            _key:      key,
            mediaType: 'image',
            image: {
              _type: 'image',
              asset: { _type: 'reference', _ref: assetId },
            },
          });
          imagesUploaded++;
        } else {
          errors++;
        }
      } else if (item.type === 'video') {
        // Current src is a Cloudflare Stream ID — not usable with R2 yet.
        // After uploading the video to R2, open Sanity Studio and replace
        // this placeholder with the actual R2 filename, e.g. "matangia-game-theory.mp4"
        media.push({
          _type:     'mediaItem',
          _key:      key,
          mediaType: 'video',
          videoKey:  `REPLACE_WITH_R2_FILENAME__stream_was_${item.src}`,
        });
        console.log(`    ⏭  Video placeholder (update with R2 filename later)`);
        videosSkipped++;
      }
    }

    // createOrReplace is idempotent — safe to re-run if something fails midway
    await client.createOrReplace({
      _id:   `project-${String(i + 1).padStart(3, '0')}`,
      _type: 'project',
      title: project.title,
      order: i + 1,
      media,
    });

    console.log(`    ✓ Saved\n`);
  }

  console.log('─'.repeat(50));
  console.log(`✅  Migration complete!`);
  console.log(`    Images uploaded    : ${imagesUploaded}`);
  console.log(`    Video placeholders : ${videosSkipped}`);
  if (errors > 0) {
    console.log(`    Files not found    : ${errors}  ← check warnings above`);
  }
  console.log('─'.repeat(50));
  console.log(`\nNext step: upload your videos to R2, then in Sanity Studio`);
  console.log(`replace each "REPLACE_WITH_R2_FILENAME__stream_was_..." value`);
  console.log(`with the actual filename, e.g. "matangia-game-theory.mp4"\n`);
}

migrate().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
});
