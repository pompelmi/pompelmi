/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,md,mdx,js,ts,jsx,tsx}',

    // pacchetto UI installato nel sito (usa solo il bundle, non tutto il package)
    './node_modules/@pompelmi/ui-react/dist/**/*.{js,mjs,cjs}',
    './node_modules/@astrojs/starlight/**/*.{js,css}',

    // (opzionale) se usi i sorgenti locali del pacchetto:
    '../packages/ui-react/src/**/*.{ts,tsx,js,jsx}',
    '../packages/ui-react/dist/**/*.{js,mjs,cjs}',

    // escludi qualsiasi node_modules catturato per errore nei sorgenti locali
    '!../packages/ui-react/**/node_modules/**',
  ],
  theme: { extend: {} },
  plugins: [],
};