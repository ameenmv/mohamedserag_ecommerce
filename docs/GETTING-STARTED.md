# Getting started

> **باختصار:** نزّل Node 24 و Docker، وبعدين شغّل الأوامر دي بالترتيب:
>
> ```bash
> corepack enable
> cp .env.example .env
> pnpm install
> pnpm db:setup
> pnpm dev
> ```
>
> افتح المتجر على http://localhost:3000 ولوحة التحكم على http://localhost:3000/admin.

This guide takes you from a fresh clone to the store and the admin running on your machine.

## 1. Install the tools (once)

| Tool | Version | Check |
|---|---|---|
| Node.js | 24.8 or newer (see `.nvmrc`) | `node -v` |
| pnpm | 10 (bundled with Node through Corepack) | `pnpm -v` |
| Docker + Docker Compose | any recent version | `docker compose version` |
| Git | any | `git --version` |

```bash
corepack enable          # makes the right pnpm version available
nvm use                  # optional: switch to the Node version in .nvmrc
```

## 2. Get the code

```bash
git clone https://github.com/ameenmv/mohamedserag_ecommerce.git
cd mohamedserag_ecommerce
```

## 3. Configure the environment

```bash
cp .env.example .env
```

Open `.env` and change at least these:

| Variable | What to put |
|---|---|
| `ADMIN_EMAIL` | The email you will sign in to `/admin` with |
| `ADMIN_PASSWORD` | A password of at least 6 characters (only used to create the first admin) |
| `SESSION_SECRET` | A long random string, e.g. the output of `openssl rand -hex 32` |

The other values already work for local development: the database on 5432, the test database on 5433, the API on 4000 and the web on 3000. If you run the full stack in Docker, `UMAMI_SECRET` is also required (`openssl rand -hex 32`).

## 4. Install dependencies

```bash
pnpm install
```

## 5. Set up the database

```bash
pnpm db:setup
```

This one command runs four steps:

1. `pnpm db:up` starts PostgreSQL in Docker (dev on **5432**, tests on **5433**) and waits until it is healthy.
2. `pnpm db:migrate` creates the tables.
3. `pnpm db:generate` generates the Prisma client.
4. `pnpm db:seed` loads the demo catalog (26 products), zones, settings, bridal tiers, pages, 6 demo orders and the admin user from your `.env`.

Running the seed again is safe: it updates rows in place and never creates duplicates.

## 6. Run the project

```bash
pnpm dev
```

| What | URL |
|---|---|
| Store (Arabic default) | http://localhost:3000 |
| Store (English) | http://localhost:3000/en |
| Admin dashboard | http://localhost:3000/admin (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| API health | http://localhost:4000/api/health |

`pnpm dev` builds the shared package first, then runs the web (Nuxt) and the API (NestJS) in watch mode. Stop both with `Ctrl + C`.

In development, the login page at http://localhost:3000/admin/login is prefilled automatically with the seeded admin credentials from `.env` (`ADMIN_EMAIL` and `ADMIN_PASSWORD`), so you can log in with one click. The storefront and admin portal also offer an English interface at http://localhost:3000/en (and http://localhost:3000/en/admin).

If you are a new contributor or coding agent, read [AGENTS.md](../AGENTS.md) for mandatory architecture rules, conventions, and quality gates before making changes.

**Run only one side:**

```bash
pnpm --filter @serag/web dev      # web only
pnpm --filter @serag/api dev      # API only
```

## 7. Run the tests

```bash
pnpm lint                              # ESLint / oxlint
pnpm typecheck                         # TypeScript
pnpm test                              # unit tests in every package
pnpm --filter @serag/api test:e2e      # API tests against the test database (5433)
```

**Browser end-to-end tests.** Install the browser once:

```bash
pnpm --filter @serag/e2e exec e2e-web install chromium --with-deps
```

Then run them:

```bash
pnpm test:e2e
```

The runner starts web and API by itself if they are not running, or reuses them if they are. Results and a trace for each failed test are written to `tests/e2e/.e2e/results/`.

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + API in watch mode |
| `pnpm build` | Production build of everything |
| `pnpm db:up` / `pnpm db:down` | Start or stop the databases (your data is kept) |
| `pnpm db:migrate` | Apply schema changes after editing `apps/api/prisma/schema.prisma` |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:seed` | Reload the demo data |
| `pnpm db:studio` | Browse the database in Prisma Studio |
| `pnpm format` | Format the code with Prettier |

## Run the full stack in Docker (like production)

The full production-like stack requires `SESSION_SECRET` and `UMAMI_SECRET`:

```bash
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/compose.yml up -d --build
```

Database migrations run automatically on container startup via the `migrate` service.

### Seed demo data and initial admin in Docker

Run the `seed` tool service on demand:

```bash
ADMIN_EMAIL=admin@serag.local ADMIN_PASSWORD=change-me \
  docker compose -f docker/compose.yml --profile tools run --rm seed
```

Caddy serves everything on one origin: `/` (web), `/api` (API), `/uploads` (images) and `/stats` (Umami analytics). Stop the stack with:

```bash
docker compose -f docker/compose.yml down
```

### Run e2e tests against the Docker stack

To run browser end-to-end tests against Docker, launch the stack with the test seed overlay (`docker/compose.e2e.yml`) and provide `TEST_SEED_SECRET` (at least 16 characters):

```bash
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  docker compose -f docker/compose.yml -f docker/compose.e2e.yml up -d --build

APP_URL=http://localhost API_URL=http://localhost/api \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  pnpm test:e2e
```

## See the original HTML prototype

```bash
python3 -m http.server 8765 --directory prototype
```

Then open http://localhost:8765 for the store and http://localhost:8765/admin/ for the admin.

## Troubleshooting

| Problem | Fix |
|---|---|
| `port 5432 is already allocated` | Another Postgres is running. Stop it, or change the port in `docker/compose.dev.yml` and in `DATABASE_URL`. |
| `Cannot find module '@serag/shared/dist/index.js'` | Build the shared package: `pnpm --filter @serag/shared build` (`pnpm dev` and `pnpm db:seed` do this for you). |
| `Cannot find module '../generated/prisma/client.js'` | Run `pnpm db:generate`. |
| Prisma asks to reset the database | Your local schema drifted. `pnpm --filter @serag/api exec prisma migrate reset` wipes the **dev** database and reapplies the migrations; then run `pnpm db:seed`. |
| Admin login says the email or password is wrong | The admin is created from `.env` on the first seed. To change the password, set the new one in `.env` and run `SEED_RESET_ADMIN_PASSWORD=true pnpm db:seed`. |
| `test seed routes return 404` | `ALLOW_TEST_SEED` is not set to `"true"` or `TEST_SEED_SECRET` is shorter than 16 characters (the test seed module does not register its controller unless both are satisfied). If running `pnpm test:e2e` locally, check if an existing `pnpm dev` process without `ALLOW_TEST_SEED=true` was running and reused by the runner. |
| e2e: `APP_UNREACHABLE` | Make sure the databases are up (`pnpm db:up`). The runner's app log is in `tests/e2e/.e2e/logs/app.log`. |
| e2e: browser not found | Run `pnpm --filter @serag/e2e exec e2e-web install chromium --with-deps`. |

## Turn off e2e telemetry (optional)

The e2e runner sends anonymous usage statistics by default (no test names or app data). To turn it off:

```bash
pnpm --filter @serag/e2e exec e2e telemetry disable
```

## Where to go next

- [`AGENTS.md`](../AGENTS.md): contributor and AI agent guidelines, core rules, and quality gates
- [`PHASE-1.md`](PHASE-1.md): what is done and what comes next
- [`STACK.md`](STACK.md): pinned versions and technical details
- [`PRD.md`](PRD.md): the full product requirements
