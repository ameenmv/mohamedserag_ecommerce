# Operations

> **باختصار:** فيه باك أب يومي للـ database والصور، بيتشال بعد 30 يوم. اللوجز JSON وكل طلب ليه `X-Request-Id`. ولو عايز تعرف الموقع شغال ولا لأ، راقب `/api/health` و`/healthz`.

How to keep the production stack (`docker/compose.yml`) backed up, how to find a failing request in the logs, and what an uptime monitor should watch. All commands run from the repository root on the server.

## 1. Backups

The `backup` service (`docker/backup/backup.sh`, official `postgres:17` image) takes a backup when it starts and then every 24 hours:

| What | Where (on the `backups` volume) |
|---|---|
| Database dump (`pg_dump -Fc`) | `/backups/db/serag-<UTC YYYYmmdd-HHMMSS>.dump` |
| Uploaded images (tar.gz) | `/backups/uploads/uploads-<same stamp>.tar.gz` |

- **Retention:** files older than 30 days are deleted (`BACKUP_RETENTION_DAYS` changes it); the newest backup is always kept.
- **Result:** every run logs one `backup_ok` line (files and sizes) or one `backup_failed` line (stamp and step). A failed run leaves no partial file and the next run still happens.

```bash
# Did any backup fail?
docker compose -f docker/compose.yml logs backup | grep backup_failed

# Take a backup now
docker compose -f docker/compose.yml exec backup sh /backup/backup.sh --once
```

Backups on the same disk protect against mistakes (a bad migration, a deleted product), **not** against losing the server. The `offsite` service copies them to **Cloudflare R2** every 6 hours (it stays idle while the `R2_*` variables are empty):

| Variable (`docker/.env`) | Meaning |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | from Cloudflare → R2 → Manage API tokens (Object Read & Write) |
| `R2_BUCKET_BACKUPS` | a **private** bucket, e.g. `serag-backups` |
| `OFFSITE_RETENTION_DAYS` | days to keep remote copies (default 14); the newest dump and uploads archive are always kept |

```bash
docker compose -f docker/compose.yml logs offsite | grep -E "offsite_(ok|failed)"   # last copy result
```

To restore from R2, download the dump (R2 dashboard, `rclone copy r2:serag-backups/db ./` or any S3 client) and follow §3. R2's free allowance is 10 GB; the uploads archive is a full copy each day, so lower `OFFSITE_RETENTION_DAYS` if the images grow large.

Other ways to copy them off the server, for example:

```bash
docker compose -f docker/compose.yml cp backup:/backups ./serag-backups
# then upload ./serag-backups to cloud storage (rclone, aws s3 sync, …)
```

## 2. Verify a backup

Restores the dump into a scratch database (`serag_restore_check`), compares the row counts of `orders`, `products`, `settings` and `users` with the live database, prints them and drops the scratch database again. It exits 1 if a count differs.

```bash
docker compose -f docker/compose.yml exec backup sh /backup/backup.sh --once
docker compose -f docker/compose.yml exec backup ls /backups/db
docker compose -f docker/compose.yml exec backup sh /backup/verify.sh /backups/db/<file>.dump
```

Run it right after a fresh backup: an order placed between the dump and the check makes the counts differ legitimately.

## 3. Restore

1. Stop the app so nothing writes while you restore:

   ```bash
   docker compose -f docker/compose.yml stop web api
   ```

2. Restore the database. Without `--yes` the script refuses to touch the live `serag` database:

   ```bash
   docker compose -f docker/compose.yml exec backup sh /backup/restore.sh /backups/db/<file>.dump serag --yes
   ```

3. Restore the uploaded images (same stamp as the dump):

   ```bash
   docker run --rm -v serag_uploads:/uploads -v serag_backups:/backups postgres:17 \
     tar -xzf /backups/uploads/<file>.tar.gz -C /uploads
   ```

4. Start the app again:

   ```bash
   docker compose -f docker/compose.yml start api web
   ```

## 4. Logs

- The API writes **JSON lines** in production (`NODE_ENV=production`, set by the API image).
- Every API response carries an **`X-Request-Id`** header. A client or proxy may send its own id (8–128 letters, digits, `.`, `_`, `-`); otherwise the API generates one. Ask a customer or the admin for it when something fails.
- **Server errors (5xx)** are logged once with context `HttpError`: request id, method, path (never the query string), status, error class and a redacted message. Phone numbers, tokens and secrets are masked and the message is cut at 300 characters. **4xx** responses (validation, not found, rate limit) are normal traffic and are not logged.

```bash
docker compose -f docker/compose.yml logs api | grep <request id>
docker compose -f docker/compose.yml logs api | grep HttpError
```

## 5. Health checks for an uptime monitor

| URL | Checks | Healthy response |
|---|---|---|
| `https://<domain>/api/health` | API process and the database | `200` with `{"status":"ok","db":"ok",…}` |
| `https://<domain>/healthz` | Web (Nuxt) process only, no API call | `200` with `{"status":"ok"}` |

Point any uptime service at both URLs with a **1-minute** interval and alert after **2 consecutive failures**. Docker uses the same endpoints for its own container health checks.
