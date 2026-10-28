#!/bin/sh
# Copies the backup volume (database dumps and uploads archives) to Cloudflare R2 (S3-compatible)
# so a lost server or disk does not take the backups with it. Runs inside the rclone image.
# Does nothing (and stays up quietly) while the R2 variables are empty.
set -eu

BUCKET="${R2_BUCKET_BACKUPS:-}"
INTERVAL="${OFFSITE_INTERVAL_SECONDS:-21600}"
RETENTION_DAYS="${OFFSITE_RETENTION_DAYS:-14}"

if [ -z "${RCLONE_CONFIG_R2_ACCESS_KEY_ID:-}" ] || [ -z "${RCLONE_CONFIG_R2_SECRET_ACCESS_KEY:-}" ] \
  || [ -z "$BUCKET" ] || [ "${RCLONE_CONFIG_R2_ENDPOINT:-}" = "https://.r2.cloudflarestorage.com" ]; then
  echo "offsite_skipped reason=r2_not_configured"
  exec sleep infinity
fi

sync_once() {
  # Finished files only (a dump in progress ends in .partial)
  if ! rclone copy /backups "r2:${BUCKET}" --filter '+ *.dump' --filter '+ *.tar.gz' --filter '- *' 2>&1; then
    echo "offsite_failed step=copy" >&2
    return 1
  fi

  # Drop old copies, but never the newest of each kind
  for kind in 'db/serag-*.dump' 'uploads/uploads-*.tar.gz'; do
    newest=$(rclone lsf "r2:${BUCKET}" --include "$kind" --files-only -R 2>/dev/null | sort | tail -n 1 || true)
    if [ -n "$newest" ]; then
      # Filters are read in order: keep the newest, then match this kind, then ignore the rest
      rclone delete "r2:${BUCKET}" --filter "- ${newest}" --filter "+ ${kind}" --filter '- *' \
        --min-age "${RETENTION_DAYS}d" 2>&1 || true
    fi
  done

  count=$(rclone lsf "r2:${BUCKET}" --files-only -R 2>/dev/null | wc -l | tr -d ' ')
  echo "offsite_ok bucket=${BUCKET} files=${count}"
}

while true; do
  sync_once || true
  sleep "$INTERVAL"
done
