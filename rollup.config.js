// rollup.config.js
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve           from '@rollup/plugin-node-resolve';
import commonjs          from '@rollup/plugin-commonjs';
import typescript        from '@rollup/plugin-typescript';
import babel             from '@rollup/plugin-babel';

export default {
  input: 'src/index.ts',
  plugins: [
    peerDepsExternal(),                // ← auto-externalizes react & react-dom
    resolve({ browser: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    babel({
      extensions: ['.js','.jsx','.ts','.tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    }),
  ],
  output: [
    { file: 'dist/local-file-scanner.esm.js', format: 'esm' },
    { file: 'dist/local-file-scanner.cjs.js', format: 'cjs', exports: 'named' },
  ],
};