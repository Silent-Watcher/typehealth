import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: 'esm',
  dts: true,
  platform: 'node',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
})
