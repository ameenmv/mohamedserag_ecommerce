import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Local runs read the repo .env (ADMIN_EMAIL / ADMIN_PASSWORD); CI passes real env vars.
try {
  process.loadEnvFile('../../.env');
} catch {
  // no .env: rely on the environment
}

const testSeedSecret = process.env.TEST_SEED_SECRET || 'dev-test-seed-secret-32-chars-long!';
process.env.TEST_SEED_SECRET ||= testSeedSecret;

export default {
  targets: [{
    engine: web(),
    app: {
      // Dev: web on :3000, API on :4000. Docker/prod: both behind Caddy on one origin (set APP_URL and API_URL to it).
      url: process.env.APP_URL ?? 'http://localhost:3000',
      // Without APP_URL the runner starts web + API (turbo `pnpm dev` at the repo root) and stops them after the run.
      ...(process.env.APP_URL
        ? {}
        : {
            command: {
              executable: 'pnpm',
              args: ['dev'],
              cwd: '../..',
              // CI has no .env file, so the API and web need their config passed through.
              inheritEnv: [
                'NODE_ENV',
                'XDG_*',
                'CI',
                'DATABASE_URL',
                'TEST_DATABASE_URL',
                'API_PORT',
                'SESSION_SECRET',
                'WEB_ORIGIN',
                'ADMIN_*',
                'NUXT_*',
              ],
              env: {
                ALLOW_TEST_SEED: 'true',
                TEST_SEED_SECRET: testSeedSecret,
              },
              startupTimeout: 180_000,
              reuseExisting: true,
              log: '.e2e/logs/app.log',
            },
          }),
    },
  }],
  credentials: {
    admin: { username: process.env.ADMIN_EMAIL ?? '', password: process.env.ADMIN_PASSWORD ?? '' },
  },
  secrets: {
    'test-seed': testSeedSecret,
  },
} satisfies E2EConfig;
