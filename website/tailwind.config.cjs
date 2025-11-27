/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,md,mdx,js,ts,jsx,tsx}',

    // UI package installed in the site (uses only the bundle, not the entire package)
    './node_modules/@pompelmi/ui-react/dist/**/*.{js,mjs,cjs}',
    './node_modules/@astrojs/starlight/**/*.{js,css}',

    // (optional) if you use local package sources:
    '../packages/ui-react/src/**/*.{ts,tsx,js,jsx}',
    '../packages/ui-react/dist/**/*.{js,mjs,cjs}',

    // exclude any node_modules caught by mistake in local sources
    '!../packages/ui-react/**/node_modules/**',
  ],
  theme: { extend: {} },
  plugins: [],
};