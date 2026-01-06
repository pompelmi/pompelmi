// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const NATIVE_EXTERNAL = [
  /^@litko\/yara-x(?:$|\/)/,
  /\.node(\?|$)/,
];

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/pompelmi.esm.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,   // 👈 aggiungi questo
    },
    {
      file: 'dist/pompelmi.cjs',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,   // 👈 e anche qui
    },
  ],
  external: (id) => NATIVE_EXTERNAL.some((re) => re.test(id)),
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};