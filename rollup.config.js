import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/local-file-scanner.esm.js', format: 'esm' },
    { file: 'dist/local-file-scanner.cjs.js', format: 'cjs' }
  ],
  external: ['react'],
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs({ ignore: ['yara'] }),
    babel({ 
      babelHelpers: 'bundled', 
      extensions: ['.js','.jsx'], 
      exclude: 'node_modules/**' 
    })
  ]
};