import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import swc from 'unplugin-swc'
import { config } from 'dotenv'

config({ path: '../../.env', quiet: true })

// API tests: boot the Nest app against the test database (TEST_DATABASE_URL).
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    globalSetup: ['test/global-setup.ts'],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
  },
})
