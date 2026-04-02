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
  title: 'Pompelmi',
  description:
    'In-process file upload security for Node.js. Inspect untrusted files before storage with local-first checks for spoofed files, archive abuse, and risky document structures.',

  // v0.33+ => social is an ARRAY of links
  social: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/pompelmi/pompelmi' }
  ],

  // head must use objects { tag, attrs, content? }
  head: [
    { tag: 'meta', attrs: { property: 'og:site_name', content: 'Pompelmi' } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
    { tag: 'meta', attrs: { property: 'og:image', content: 'https://pompelmi.github.io/pompelmi/og.png' } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'theme-color', content: '#0f172a' } },
    { tag: 'meta', attrs: { name: 'robots', content: 'index,follow,max-image-preview:large' } },
    { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/pompelmi/logo.svg' } },
    { tag: 'link', attrs: { rel: 'manifest', href: '/pompelmi/site.webmanifest' } },
  ],

  editLink: {
    baseUrl: 'https://github.com/pompelmi/pompelmi/edit/main/website/src/content/docs/'
  },
  sidebar: [
    { label: 'Getting started', slug: 'getting-started' },
    { label: 'Framework guides', autogenerate: { directory: 'how-to', collapsed: false } },
    { label: 'Use cases', autogenerate: { directory: 'use-cases', collapsed: false } },
    { label: 'Comparisons', autogenerate: { directory: 'comparisons', collapsed: false } },
    { label: 'Tutorials', autogenerate: { directory: 'tutorials', collapsed: false } },
    { label: 'Reference', autogenerate: { directory: 'reference', collapsed: true } },
    { label: 'Explanations', autogenerate: { directory: 'explaination', collapsed: true } },
    { label: 'Production readiness', slug: 'production-readiness' },
    { label: 'Featured in', link: '/pompelmi/featured-in/' },
    { label: 'Translations', link: '/pompelmi/translations/' },
    { label: 'Blog', link: '/pompelmi/blog/' },
    { label: 'Support', slug: 'support' },
    { label: 'Enterprise options', slug: 'enterprise' }
  ],
  tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
  pagefind: true,
  disable404Route: true
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
