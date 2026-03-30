import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

export async function fetchProjects() {
  return client.fetch(`
    *[_type == "project"] | order(order asc) {
      title,
      "media": media[] {
        "type": mediaType,
        "src": select(
          mediaType == "image" => image.asset->url + "?w=1080&q=85&auto=format&fit=max",
          mediaType == "video" => videoKey
        )
      }
    }
  `);
}
