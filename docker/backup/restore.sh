#!/bin/sh
# Executable intent: chmod +x docker/backup/restore.sh
#
# Intended usage:
# docker compose -f docker/compose.yml run --rm --entrypoint sh backup /backup/restore.sh /backups/db/<file>.dump serag --yes
#
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: $0 <dump-file> [target-db] [--yes]" >&2
  exit 1
fi

DUMP_FILE="$1"
if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: dump file not found: $DUMP_FILE" >&2
  exit 1
fi

TARGET_DB="serag"
HAS_YES=0

eval "last_arg=\${$#}"
if [ "$last_arg" = "--yes" ]; then
  HAS_YES=1
fi

if [ $# -ge 2 ] && [ "$2" != "--yes" ]; then
  TARGET_DB="$2"
fi

if [ "$TARGET_DB" = "serag" ] && [ "$HAS_YES" -ne 1 ]; then
  echo "Refusing to restore into live database 'serag' without --yes confirmation." >&2
  echo "Usage: $0 <dump-file> serag --yes" >&2
  exit 1
fi

export PGPASSWORD="${PGPASSWORD:-serag}"
PGHOST="${PGHOST:-db}"
PGUSER="${PGUSER:-serag}"

echo "Restoring ${DUMP_FILE} into database '${TARGET_DB}' on ${PGHOST}..."
pg_restore -h "$PGHOST" -U "$PGUSER" --clean --if-exists --no-owner --no-privileges -d "$TARGET_DB" "$DUMP_FILE"
echo "Restore completed successfully into '${TARGET_DB}'."
