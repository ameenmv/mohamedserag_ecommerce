#!/bin/sh
# Executable intent: chmod +x docker/backup/backup.sh
# Runs periodic PostgreSQL database dumps and uploads tar archives.
set -eu

PGHOST="${PGHOST:-db}"
PGUSER="${PGUSER:-serag}"
PGPASSWORD="${PGPASSWORD:-serag}"
PGDATABASE="${PGDATABASE:-serag}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
export PGPASSWORD

mkdir -p /backups/db /backups/uploads

rotate_backups() {
  days="${BACKUP_RETENTION_DAYS:-30}"

  newest_db=$(ls -1t /backups/db/serag-*.dump 2>/dev/null | head -n 1 || true)
  if [ -n "$newest_db" ]; then
    find /backups/db -maxdepth 1 -name 'serag-*.dump' -mtime +"$days" ! -name "$(basename "$newest_db")" -delete 2>/dev/null || true
  fi

  newest_uploads=$(ls -1t /backups/uploads/uploads-*.tar.gz 2>/dev/null | head -n 1 || true)
  if [ -n "$newest_uploads" ]; then
    find /backups/uploads -maxdepth 1 -name 'uploads-*.tar.gz' -mtime +"$days" ! -name "$(basename "$newest_uploads")" -delete 2>/dev/null || true
  fi
}

run_backup() {
  stamp=$(date -u +'%Y%m%d-%H%M%S')
  db_partial="/backups/db/serag-${stamp}.dump.partial"
  db_final="/backups/db/serag-${stamp}.dump"
  uploads_final="/backups/uploads/uploads-${stamp}.tar.gz"

  if ! pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$db_partial"; then
    echo "backup_failed stamp=${stamp} step=pg_dump" >&2
    rm -f "$db_partial"
    return 1
  fi

  if ! mv "$db_partial" "$db_final" 2>/dev/null; then
    echo "backup_failed stamp=${stamp} step=mv" >&2
    rm -f "$db_partial"
    return 1
  fi

  if ! tar -czf "$uploads_final" -C /uploads .; then
    echo "backup_failed stamp=${stamp} step=tar" >&2
    rm -f "$uploads_final"
    return 1
  fi

  size_db=$(wc -c < "$db_final" | tr -d ' ')
  size_uploads=$(wc -c < "$uploads_final" | tr -d ' ')
  echo "backup_ok stamp=${stamp} db=${db_final} (${size_db} bytes) uploads=${uploads_final} (${size_uploads} bytes)"

  rotate_backups
  return 0
}

ONCE=0
if [ "${1:-}" = "--once" ]; then
  ONCE=1
fi

if [ "$ONCE" -eq 1 ]; then
  if run_backup; then
    exit 0
  else
    exit 1
  fi
fi

while true; do
  run_backup || true
  sleep "${BACKUP_INTERVAL_SECONDS}"
done
