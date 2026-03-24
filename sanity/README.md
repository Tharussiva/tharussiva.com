# Sanity Studio Setup

The schema in `schemas/project.js` defines the data structure for your portfolio projects.

## Steps

1. Create a new Sanity Studio project:
   ```bash
   npm create sanity@latest
   ```
   Choose a project name, select the existing project ID from your sanity.io account, and pick the "Clean" template.

2. Copy `schemas/project.js` into the studio's `schemaTypes/` folder.

3. Register it in the studio's `schemaTypes/index.js`:
   ```js
   import project from './project';
   export const schemaTypes = [project];
   ```

4. Deploy the studio:
   ```bash
   npx sanity deploy
   ```
   Sanity hosts this for free at `your-project-name.sanity.studio`.

## Entering content

Each document in the Studio maps to one entry in `projects.js`.

- **Title** — the project name shown in the nav and list view
- **Order** — the position in the feed (1 = first)
- **Media** — one or more image/video items per project:
  - **Image**: upload directly in the Studio — Sanity hosts and serves it via CDN
  - **Video**: enter the R2 filename exactly as uploaded (e.g. `matangia-game-theory.mp4`)

## Adding env vars to GitHub

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret name              | Value                          |
|--------------------------|--------------------------------|
| `VITE_SANITY_PROJECT_ID` | Your Sanity project ID         |
| `VITE_SANITY_DATASET`    | `production`                   |
| `VITE_R2_PUBLIC_URL`     | Your R2 bucket public URL      |
