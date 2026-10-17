import { execSync } from 'node:child_process'
import { config } from 'dotenv'

// Point the API at the test database (docker/compose.dev.yml `db-test`, tmpfs) and apply migrations.
export default function setup() {
  config({ path: '../../.env', quiet: true })
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)')
  process.env.DATABASE_URL = url
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } })
  execSync('pnpm exec prisma db seed', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: url,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@test.local',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'test-admin-password',
    },
  })
}
