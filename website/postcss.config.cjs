/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,md,mdx,tsx,jsx}',

    // UI package installed in the site:
    './node_modules/@pompelmi/ui-react/**/*.{js,mjs,cjs,ts,tsx}',

    // (optional) if you use local package sources:
    '../packages/ui-react/src/**/*.{ts,tsx}',
    '../packages/ui-react/dist/**/*.{js,mjs,cjs}',
  ],
  theme: { extend: {} },
  plugins: [],
};