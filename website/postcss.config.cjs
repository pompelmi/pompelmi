/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,md,mdx,tsx,jsx}',

    // pacchetto UI installato nel sito:
    './node_modules/@pompelmi/ui-react/**/*.{js,mjs,cjs,ts,tsx}',

    // (opzionale) se usi i sorgenti locali del pacchetto:
    '../packages/ui-react/src/**/*.{ts,tsx}',
    '../packages/ui-react/dist/**/*.{js,mjs,cjs}',
  ],
  theme: { extend: {} },
  plugins: [],
};