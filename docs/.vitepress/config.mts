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
            { text: 'CLI Reference', link: '/guide/cli-reference' },
          ],
        },
      ],
      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Analysis Engine', link: '/concepts/analysis-engine' },
            { text: 'Type Safety Metrics', link: '/concepts/type-safety-metrics' },
            { text: 'Runtime Boundaries', link: '/concepts/runtime-boundaries' },
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
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Exit Codes', link: '/reference/exit-codes' },
            { text: 'Metric Definitions', link: '/reference/metric-definitions' },
          ],
        },
      ],
    },
  },
})
