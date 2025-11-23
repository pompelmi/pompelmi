import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

import { visit } from 'unist-util-visit';

function addMermaidClass() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'code' &&
        node.properties &&
        Array.isArray(node.properties.className) &&
        node.properties.className.includes('language-mermaid')
      ) {
        // Convert fenced ```mermaid blocks into <pre class="mermaid"> for rehype-mermaid
        node.tagName = 'pre';
        node.properties.className = ['mermaid'];
        const text = node.children && node.children[0] && node.children[0].value ? node.children[0].value : '';
        node.children = [{ type: 'text', value: text }];
      }
    });
  };
}

export default defineConfig({
  site: 'https://pompelmi.github.io/pompelmi',
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

  // v0.33+ => social è un ARRAY di link
  social: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/pompelmi/pompelmi' }
  ],

  // head deve usare oggetti { tag, attrs, content? }
  head: [
    { tag: 'link', attrs: { rel: 'canonical', href: 'https://pompelmi.github.io/pompelmi/' } },
    { tag: 'meta', attrs: { property: 'og:title', content: 'Pompelmi — File upload malware scanning for Node.js' } },
    { tag: 'meta', attrs: { property: 'og:description', content: 'Scan & block malicious uploads with ZIP deep-inspection, MIME/size guards, optional YARA.' } },
    { tag: 'meta', attrs: { property: 'og:url', content: 'https://pompelmi.github.io/pompelmi/' } },
    { tag: 'meta', attrs: { property: 'og:image', content: 'https://pompelmi.github.io/pompelmi/og.png' } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  ],

  editLink: {
    baseUrl: 'https://github.com/pompelmi/pompelmi/edit/main/website/src/content/docs/'
  },
  sidebar: [
    { label: 'Overview', slug: 'index' },
    { 
      label: 'Blog', 
      link: '/pompelmi/blog/',
      badge: { text: 'New', variant: 'success' }
    },
    { label: 'Tutorials', autogenerate: { directory: 'tutorials', collapsed: false } },
    { label: 'How-to Guides', autogenerate: { directory: 'how-to', collapsed: false } },
    { label: 'Reference', autogenerate: { directory: 'reference', collapsed: true } },
    { label: 'Explanations', autogenerate: { directory: 'explanations', collapsed: true } }
  ],
  tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
  pagefind: true
})
  ],
  markdown: {
    rehypePlugins: [addMermaidClass],
    shikiConfig: {
      theme: 'github-light',
      darkTheme: 'github-dark'
    }
  },
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