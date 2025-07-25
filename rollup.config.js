// rollup.config.js
import resolve    from '@rollup/plugin-node-resolve';
import commonjs   from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel      from '@rollup/plugin-babel';

export default {
  input: 'src/index.ts',
  // mark react (and the JSX runtime) as external so we never bundle or stub it
  external: ['react', 'react/jsx-runtime'],
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
    }
  ],
  plugins: [
    // resolve browser‐only modules, but do NOT try to bundle React
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    babel({
      extensions: ['.js','.jsx','.ts','.tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
};