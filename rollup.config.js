import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/local-file-scanner.esm.js', format: 'esm' },
    { file: 'dist/local-file-scanner.cjs.js', format: 'cjs', exports: 'named' }
  ],
  external: ['react'],
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs({ ignore: ['yara'] }),
    typescript({ tsconfig: './tsconfig.json' }),
    babel({
      extensions: ['.js','.jsx','.ts','.tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
};