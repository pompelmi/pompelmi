/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',

    // se usi il pacchetto dal workspace:
    '../../packages/ui-react/src/**/*.{ts,tsx}',
    '../../packages/ui-react/dist/**/*.{js,mjs,cjs}',

    // se (in alternativa) usi il pacchetto installato in node_modules (tarball/link):
    './node_modules/@pompelmi/ui-react/**/*.{js,mjs,cjs,ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};