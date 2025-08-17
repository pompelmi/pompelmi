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
      { text: 'GitHub', link: 'https://github.com/pompelmi/pompelmi' }
    ],
    sidebar: {
      '/docs/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/docs/' }
          ]
        }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/pompelmi/pompelmi' }]
  }
})
