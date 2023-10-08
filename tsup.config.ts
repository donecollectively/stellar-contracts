import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['/index.ts'],
//   dts: true,
  format: [ 'cjs', "esm" ],
  splitting: false,
  sourcemap: true,
  clean: true,
  loader: {
    ".hl": "text"
  }
})
