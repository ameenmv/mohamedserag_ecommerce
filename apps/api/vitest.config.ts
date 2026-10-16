import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import swc from 'unplugin-swc'

// SWC emits decorator metadata, which Nest's dependency injection needs at test time.
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
})
