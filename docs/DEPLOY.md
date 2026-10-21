# Deploy

> **باختصار:** سيرفر فيه Docker ودومين بيشاور على الـ IP بتاعه. انسخ `docker/.env.production.example` لـ `docker/.env`، واملأ الأسرار، وبعدين شغّل `docker compose -f docker/compose.yml up -d --build`. Caddy بيطلّع شهادة HTTPS لوحده.

How to put the store on a server, keep it updated and roll back. Day-to-day operations (backups, restore, logs, uptime) are in [OPERATIONS.md](OPERATIONS.md). Everything the owner has to decide or provide before launch is in [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## 1. Server

| Need | Recommendation |
|---|---|
| VPS | 2 vCPU, 4 GB RAM, 40 GB SSD (Ubuntu 24.04 LTS) |
| Software | Docker Engine + Docker Compose plugin, Git |
| Network | Ports **80** and **443** open; nothing else exposed |
| Domain | An `A` record (and `AAAA` if IPv6) for the domain pointing at the server |

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out and back in
git clone <repository-url> serag && cd serag
```

## 2. Environment

Compose reads `docker/.env` (next to `compose.yml`). Copy `docker/.env.production.example` to it and fill it in; never commit it.

| Variable | Secret | Example / how to make it | Used by |
|---|---|---|---|
| `SITE_ADDRESS` | | `serag-store.com` (Caddy gets the HTTPS certificate for it) | caddy |
| `PUBLIC_URL` | | `https://serag-store.com` | api, web |
| `SITE_INDEXABLE` | | `true` on the real domain only (otherwise robots.txt blocks search engines) | web |
| `POSTGRES_USER` | | `serag` | db, api, backup |
| `POSTGRES_PASSWORD` | ✅ | `openssl rand -base64 24` | db, api, backup |
| `SESSION_SECRET` | ✅ | `openssl rand -base64 48` (32+ characters) | api |
| `UMAMI_SECRET` | ✅ | `openssl rand -base64 32` | umami |
| `UMAMI_WEBSITE_ID` | | from the Umami dashboard after the first deploy (step 4) | web |
| `ADMIN_EMAIL` | | the owner's email, for the first admin user | seed |
| `ADMIN_PASSWORD` | ✅ | a strong password; change it after the first login | seed |
| `BACKUP_RETENTION_DAYS` | | `30` (default) | backup |

`ALLOW_TEST_SEED` is `false` in `compose.yml` and must stay that way; `docker/compose.e2e.yml` (which turns it on) is for CI only.

## 3. First deploy

```bash
docker compose -f docker/compose.yml up -d --build      # db, migrate, api, web, umami, caddy, backup
docker compose -f docker/compose.yml ps                  # all "healthy"/"running"; migrate "exited (0)"
docker compose -f docker/compose.yml --profile tools run --rm seed   # first time only
```

- `migrate` applies the database migrations on every start and then exits.
- `seed` creates the permissions, the admin user, categories, brands, the starter catalogue, settings, bridal tiers, content, guides and quizzes. On the server it does **not** create demo orders (`SEED_DEMO_ORDERS=false`). Running it again is safe: it updates rather than duplicates.
- Caddy requests the HTTPS certificate on first start; it needs ports 80/443 reachable and the DNS record already pointing at the server. Check with `docker compose -f docker/compose.yml logs caddy`.

Then open `https://<domain>/admin`, sign in, change the password and work through «الإعدادات» (store numbers, payment accounts, zones) — see the launch checklist.

## 4. Analytics (Umami)

1. `docker compose -f docker/compose.yml port umami 3000` and open it through an SSH tunnel (`ssh -L 3001:localhost:<port> server`), log in with `admin` / `umami` and **change that password**.
2. Add a website for the domain and copy its website id into `UMAMI_WEBSITE_ID` in `docker/.env`.
3. `docker compose -f docker/compose.yml up -d web` to pick it up.

Umami is cookie-less, so no cookie banner is needed (decided in the launch checklist).

## 5. Update to a new version

```bash
git fetch && git checkout <tag-or-commit>
docker compose -f docker/compose.yml exec backup sh /backup/backup.sh --once   # fresh backup first
docker compose -f docker/compose.yml up -d --build
docker compose -f docker/compose.yml ps
curl -fsS https://<domain>/api/health && curl -fsS https://<domain>/healthz
```

`migrate` runs before the new API starts, so schema changes are applied automatically.

## 6. Roll back

- **Code only** (no migration in the bad version): `git checkout <previous-tag>` and `docker compose -f docker/compose.yml up -d --build`.
- **With a migration**: Prisma migrations are forward-only. Restore the backup taken before the update ([OPERATIONS.md §3](OPERATIONS.md#3-restore)), then check out the previous version and rebuild.

## 7. After going live

- Point an uptime monitor at `https://<domain>/api/health` and `https://<domain>/healthz` ([OPERATIONS.md §5](OPERATIONS.md#5-health-checks-for-an-uptime-monitor)).
- Copy backups off the server on a schedule ([OPERATIONS.md §1](OPERATIONS.md#1-backups)).
- Submit `https://<domain>/sitemap.xml` in Google Search Console and the feed `https://<domain>/feeds/google.xml` in Google Merchant Center.
