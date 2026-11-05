import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TypeScope',
  description: 'Lightweight TypeScript type safety analyzer',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Development', link: '/development/development-setup' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Development Setup', link: '/development/development-setup' },
          ],
        },
      ],
    },
  },
})
