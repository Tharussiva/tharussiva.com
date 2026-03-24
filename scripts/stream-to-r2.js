// Migrates all videos from Cloudflare Stream → R2.
// Also updates Sanity documents with the new R2 filenames automatically.
//
// Run: npm run stream-to-r2

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@sanity/client';

const ACCOUNT_ID   = process.env.CF_ACCOUNT_ID;
const STREAM_TOKEN = process.env.CF_STREAM_TOKEN;
const R2_BUCKET    = process.env.R2_BUCKET_NAME;

const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const sanity = createClient({
  projectId:  process.env.VITE_SANITY_PROJECT_ID,
  dataset:    process.env.VITE_SANITY_DATASET || 'production',
  token:      process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn:     false,
});

// ── Helpers ──

function sanitize(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

async function createStreamDownload(streamId) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${streamId}/downloads`,
    { method: 'POST', headers: { Authorization: `Bearer ${STREAM_TOKEN}` } }
  );
  return res.json();
}

async function getStreamDownload(streamId) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${streamId}/downloads`,
    { headers: { Authorization: `Bearer ${STREAM_TOKEN}` } }
  );
  return res.json();
}

async function waitForDownload(streamId) {
  await createStreamDownload(streamId);

  process.stdout.write('    Waiting for Stream to prepare MP4 ');
  for (let i = 0; i < 60; i++) {
    const data = await getStreamDownload(streamId);
    const dl   = data?.result?.default;
    if (dl?.status === 'ready') { console.log(' ready'); return dl.url; }
    if (dl?.status === 'error') throw new Error(`Stream error for ${streamId}`);
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
  }
  throw new Error(`Timeout waiting for Stream download: ${streamId}`);
}

// ── Fetch all Stream video metadata (uid → filename) ──

async function fetchStreamVideos() {
  const res  = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`,
    { headers: { Authorization: `Bearer ${STREAM_TOKEN}` } }
  );
  const data = await res.json();
  if (!data.success) throw new Error(`Stream list failed: ${JSON.stringify(data.errors)}`);

  const map = new Map();
  for (const v of data.result) {
    // Use original filename from Stream metadata, fall back to uid
    const name = v.meta?.name || `${v.uid}.mp4`;
    // Ensure .mp4 extension
    map.set(v.uid, name.endsWith('.mp4') ? name : `${name}.mp4`);
  }
  return map;
}

// ── Main ──

async function migrate() {
  for (const [k, v] of Object.entries({
    CF_ACCOUNT_ID:            ACCOUNT_ID,
    CF_STREAM_TOKEN:          STREAM_TOKEN,
    R2_BUCKET_NAME:           R2_BUCKET,
    R2_ACCESS_KEY_ID:         process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY:     process.env.R2_SECRET_ACCESS_KEY,
    VITE_SANITY_PROJECT_ID:   process.env.VITE_SANITY_PROJECT_ID,
    SANITY_WRITE_TOKEN:       process.env.SANITY_WRITE_TOKEN,
  })) {
    if (!v) { console.error(`❌  ${k} is not set in .env`); process.exit(1); }
  }

  // Load Stream filename map
  process.stdout.write('Fetching Stream video list ... ');
  const streamVideos = await fetchStreamVideos();
  console.log(`${streamVideos.size} videos found\n`);

  const docs = await sanity.fetch(`
    *[_type == "project" && count(media[videoKey match "REPLACE_WITH_R2_FILENAME*"]) > 0] {
      _id, title, media
    }
  `);

  if (!docs.length) {
    console.log('✅  No placeholders found — already migrated.');
    return;
  }

  console.log(`\n🎬  Migrating ${docs.length} projects with video placeholders...\n`);

  let success = 0;
  let failed  = 0;

  for (const doc of docs) {
    for (const item of doc.media) {
      if (!item.videoKey?.startsWith('REPLACE_WITH_R2_FILENAME__stream_was_')) continue;

      const streamId = item.videoKey.replace('REPLACE_WITH_R2_FILENAME__stream_was_', '');
      // Use the original filename from Stream, fall back to sanitized title
      const filename = streamVideos.get(streamId) || `${sanitize(doc.title)}-${streamId.slice(0, 8)}.mp4`;

      console.log(`📹  ${doc.title}`);
      console.log(`    Stream → ${streamId}`);
      console.log(`    R2 key → ${filename}`);

      try {
        const downloadUrl = await waitForDownload(streamId);

        process.stdout.write('    Downloading ... ');
        const res    = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        console.log(`done (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`);

        process.stdout.write('    Uploading to R2 ... ');
        await s3.send(new PutObjectCommand({
          Bucket:      R2_BUCKET,
          Key:         filename,
          Body:        buffer,
          ContentType: 'video/mp4',
        }));
        console.log('done');

        await sanity
          .patch(doc._id)
          .set({ [`media[_key == "${item._key}"].videoKey`]: filename })
          .commit();

        console.log(`    ✓ Sanity updated\n`);
        success++;
      } catch (err) {
        console.error(`\n    ❌ Failed: ${err.message}\n`);
        failed++;
      }
    }
  }

  console.log('─'.repeat(50));
  console.log(`✅  ${success} videos migrated${failed ? `, ${failed} failed` : ''}`);
  console.log('─'.repeat(50));
  console.log(`\nVideos live at: ${process.env.VITE_R2_PUBLIC_URL}/<filename>.mp4\n`);
}

migrate().catch(err => {
  console.error('\n❌  Script failed:', err.message);
  process.exit(1);
});
