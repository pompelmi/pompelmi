import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://pompelmi.github.io',
  base: '/pompelmi/',
  output: 'static',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    starlight({
      title: 'Pompelmi Docs',
      description:
        'File upload malware scanning for Node.js apps. React/Next UI, Express/Koa middleware, size & MIME guards, optional YARA.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/pompelmi/pompelmi' }
      ],
      editLink: {
        baseUrl: 'https://github.com/pompelmi/pompelmi/edit/main/website/src/content/docs/'
      },
      sidebar: [
        { label: 'Overview', slug: 'index' },
        { label: 'Tutorials', autogenerate: { directory: 'tutorials', collapsed: false } },
        { label: 'How-to Guides', autogenerate: { directory: 'how-to', collapsed: false } },
        { label: 'Reference', autogenerate: { directory: 'reference', collapsed: true } },
        { label: 'Explanations', autogenerate: { directory: 'explanations', collapsed: true } }
      ],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      pagefind: true
    })
  ],
  vite: {
    resolve: {
      alias: {
        '@pompelmi/ui-react': fileURLToPath(new URL('../packages/ui-react/dist', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['@pompelmi/ui-react'],
    },
  },
});