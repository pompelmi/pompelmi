import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'pompelmi - Fast File Upload Security for Node.js',
  description: 'Fast file upload malware scanning for Node.js with YARA integration, ZIP bomb protection, and Express/Koa/Next.js adapters. Private by design. TypeScript-first.',
  // Project Page: serve sotto /pompelmi/
  base: '/pompelmi/',
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'mask-icon', href: '/logo.svg', color: '#0ea5e9' }],
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],
    
    // SEO Meta Tags
    ['meta', { name: 'keywords', content: 'file upload security, malware detection, YARA, Node.js security, Express middleware, Koa middleware, Next.js security, TypeScript, cybersecurity, virus scanner, ZIP bomb protection, file validation, upload sanitization, threat detection, devsecops' }],
    ['meta', { name: 'author', content: 'pompelmi contributors' }],
    
    // Open Graph / Facebook
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'pompelmi - Fast File Upload Security for Node.js' }],
    ['meta', { property: 'og:description', content: 'Fast file upload malware scanning for Node.js with YARA integration, ZIP bomb protection, and Express/Koa/Next.js adapters. Private by design.' }],
    ['meta', { property: 'og:url', content: 'https://pompelmi.github.io/pompelmi/' }],
    ['meta', { property: 'og:site_name', content: 'pompelmi' }],
    ['meta', { property: 'og:image', content: 'https://pompelmi.github.io/pompelmi/og-image.png' }],
    
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@pompelmi' }],
    ['meta', { name: 'twitter:title', content: 'pompelmi - Fast File Upload Security for Node.js' }],
    ['meta', { name: 'twitter:description', content: 'Fast file upload malware scanning for Node.js with YARA integration, ZIP bomb protection, and Express/Koa/Next.js adapters.' }],
    ['meta', { name: 'twitter:image', content: 'https://pompelmi.github.io/pompelmi/og-image.png' }],
    
    // Additional SEO
    ['link', { rel: 'canonical', href: 'https://pompelmi.github.io/pompelmi/' }],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['meta', { name: 'googlebot', content: 'index,follow' }],
    
    // Structured Data (JSON-LD)
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "pompelmi",
      "description": "Fast file upload malware scanning for Node.js with YARA integration, ZIP bomb protection, and Express/Koa/Next.js adapters. Private by design.",
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "Node.js",
      "programmingLanguage": "TypeScript",
      "author": {
        "@type": "Organization",
        "name": "pompelmi contributors"
      },
      "codeRepository": "https://github.com/pompelmi/pompelmi",
      "downloadUrl": "https://www.npmjs.com/package/pompelmi",
      "installUrl": "https://www.npmjs.com/package/pompelmi",
      "license": "https://github.com/pompelmi/pompelmi/blob/main/LICENSE",
      "version": "0.20.0",
      "keywords": "file upload security, malware detection, YARA, Node.js, Express, TypeScript, cybersecurity",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    })]
  ],
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
        { icon: 'npm', link: 'https://www.npmjs.com/package/pompelmi' },
        { icon: 'twitter', link: 'https://twitter.com/pompelmi' },
        { icon: 'discord', link: 'https://discord.gg/pompelmi' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 pompelmi contributors'
    },
    editLink: {
      pattern: 'https://github.com/pompelmi/pompelmi/edit/main/site/:path'
    },
    search: {
      provider: 'local'
    }
  }
})
