#!/bin/sh
# Executable intent: chmod +x docker/backup/verify.sh
#
# Verifies a backup dump file by restoring it into a temporary scratch database
# ('serag_restore_check') and comparing row counts for orders, products,
# settings, and users with the live 'serag' database.
#
# Note: Counts can legitimately differ if orders or changes arrived after the dump
# was taken. To get an exact comparison, run this right after taking a fresh backup:
#   docker compose -f docker/compose.yml exec backup /backup/backup.sh --once
#   docker compose -f docker/compose.yml exec backup /backup/verify.sh /backups/db/<file>.dump
#
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: $0 <dump-file>" >&2
  exit 1
fi

DUMP_FILE="$1"
if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: dump file not found: $DUMP_FILE" >&2
  exit 1
fi

export PGPASSWORD="${PGPASSWORD:-serag}"
PGHOST="${PGHOST:-db}"
PGUSER="${PGUSER:-serag}"
SOURCE_DB="${PGDATABASE:-serag}"
SCRATCH_DB="serag_restore_check"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

cleanup() {
  psql -h "$PGHOST" -U "$PGUSER" -d "$SOURCE_DB" -c "DROP DATABASE IF EXISTS ${SCRATCH_DB};" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Preparing scratch database '${SCRATCH_DB}' on ${PGHOST}..."
psql -h "$PGHOST" -U "$PGUSER" -d "$SOURCE_DB" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${SCRATCH_DB};" >/dev/null
psql -h "$PGHOST" -U "$PGUSER" -d "$SOURCE_DB" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${SCRATCH_DB};" >/dev/null

echo "Restoring ${DUMP_FILE} into ${SCRATCH_DB}..."
sh "${SCRIPT_DIR}/restore.sh" "$DUMP_FILE" "$SCRATCH_DB"

echo "Comparing table row counts between ${SOURCE_DB} and ${SCRATCH_DB}:"
echo "table source restored"

mismatch=0
for table in orders products settings users; do
  source_count=$(psql -h "$PGHOST" -U "$PGUSER" -d "$SOURCE_DB" -t -A -c "SELECT COUNT(*) FROM ${table};" | tr -d ' ')
  restored_count=$(psql -h "$PGHOST" -U "$PGUSER" -d "$SCRATCH_DB" -t -A -c "SELECT COUNT(*) FROM ${table};" | tr -d ' ')

  echo "$table $source_count $restored_count"
  if [ "$source_count" != "$restored_count" ]; then
    mismatch=1
  fi
done

if [ "$mismatch" -ne 0 ]; then
  echo "Verification failed: row counts differ between ${SOURCE_DB} and ${SCRATCH_DB}" >&2
  exit 1
fi

echo "Verification succeeded: all table counts match."
