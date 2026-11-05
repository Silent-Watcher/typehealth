import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TypeHealth',
  description: 'Lightweight TypeScript type safety analyzer',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],
    themeConfig: {
      nav: [
        { text: 'Guide', link: '/guide/introduction' },
        { text: 'Concepts', link: '/concepts/analysis-engine' },
        { text: 'Features', link: '/features/terminal-report' },
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
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'Terminal Report', link: '/features/terminal-report' },
            { text: 'JSON Report', link: '/features/json-report' },
            { text: 'HTML Report', link: '/features/html-report' },
            { text: 'CI Integration', link: '/features/ci-integration' },
          ],
        },
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Development Setup', link: '/development/development-setup' },
            { text: 'Architecture', link: '/development/architecture' },
            { text: 'Project Structure', link: '/development/project-structure' },
            { text: 'Testing', link: '/development/testing' },
            { text: 'Performance', link: '/development/performance' },
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
      '/security/': [
        {
          text: 'Security',
          items: [
            { text: 'Security Model', link: '/security/security-model' },
          ],
        },
      ],
    },
  },
})
