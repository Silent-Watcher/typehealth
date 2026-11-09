import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TypeHealth',
  description: 'Lightweight TypeScript type safety analyzer',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],
    themeConfig: {
      search: {
        provider: 'local',
        options: {
          translations: {
            button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
          },
        },
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/Silent-Watcher/typehealth' },
        {
          // npm has no built-in VitePress icon; inline the npm logo.
          icon: {
            svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M0 7.336v8h6.666v1.334H12v-1.334h6v-8H0zm1.334 1.334h13.332v5.332h-4v1.334h-2.666v-1.334H1.334V8.67zm2.666 1.33v2.668h1.334V10h1.332v2.668h1.334V10h1.332v4H12V10.002h-1.332-1.336-2.666-1.334-1.332zm8 0v4h2.666V10h1.334v2.668h1.332V10h.002v4H18.666V10h-.002z"/></svg>',
          },
          link: 'https://www.npmjs.com/package/typehealth',
        },
      ],
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025 TypeHealth contributors',
      },
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
            { text: 'AI Markdown Report', link: '/features/ai-report' },
            { text: 'Agent Skill', link: '/features/agent-skill' },
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
