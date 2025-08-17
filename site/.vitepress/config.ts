import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'Pompelmi',
  description: 'File-upload malware scanning for Node.js',
  // Project Page: serve sotto /pompelmi/
  base: '/pompelmi/',
  ignoreDeadLinks: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Docs', link: '/docs/' },
      { text: 'Demo', link: '/demo/' },
      { text: 'GitHub', link: 'https://github.com/pompelmi/pompelmi' },
    ],
    sidebar: {
      '/docs/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/docs/' },
            { text: 'Quickstart (Express)', link: '/docs/quickstart-express' },
            { text: 'Policy', link: '/docs/policy' },
            { text: 'ZIP Deep-Inspection', link: '/docs/zip-inspection' },
            { text: 'Adapters Overview', link: '/docs/adapters' }
          ]
        }
      ]
    },
    socialLinks: [
        { icon: 'github', link: 'https://github.com/pompelmi/pompelmi' },
        { icon: 'npm', link: 'https://www.npmjs.com/package/pompelmi' } 
    ]
  }
})
