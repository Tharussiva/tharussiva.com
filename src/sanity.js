import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
});

export async function fetchProjects() {
  return client.fetch(`
    *[_type == "project"] | order(order asc) {
      title,
      "media": media[] {
        "type": mediaType,
        "src": select(
          mediaType == "image" => image.asset->url + "?w=2160&q=90&auto=format&fit=max",
          mediaType == "video" => videoKey
        )
      }
    }
  `);
}
