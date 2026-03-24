// Sanity schema for a portfolio project.
// Each project has a title, an order (controls display sequence),
// and a media array of images (stored in Sanity) and/or videos (stored in R2).

export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'order',
      title: 'Order',
      description: 'Controls the display sequence. Lower numbers appear first.',
      type: 'number',
      validation: Rule => Rule.required().integer().positive(),
    },
    {
      name: 'media',
      title: 'Media',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'mediaItem',
          fields: [
            {
              name: 'mediaType',
              title: 'Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Image (Sanity)', value: 'image' },
                  { title: 'Video (R2)',     value: 'video' },
                ],
                layout: 'radio',
              },
              validation: Rule => Rule.required(),
            },
            {
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              hidden: ({ parent }) => parent?.mediaType !== 'image',
            },
            {
              name: 'videoKey',
              title: 'Video filename in R2',
              description: 'The filename you uploaded to your R2 bucket, e.g. "matangia-game-theory.mp4"',
              type: 'string',
              hidden: ({ parent }) => parent?.mediaType !== 'video',
            },
          ],
          preview: {
            select: {
              mediaType: 'mediaType',
              image:     'image',
              videoKey:  'videoKey',
            },
            prepare({ mediaType, image, videoKey }) {
              return {
                title:    mediaType === 'image' ? 'Image' : `Video: ${videoKey ?? ''}`,
                media:    image,
              };
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      title:  'title',
      order:  'order',
      media0: 'media.0.image',
    },
    prepare({ title, order, media0 }) {
      return {
        title:    `[${order}] ${title}`,
        media:    media0,
      };
    },
  },
};
