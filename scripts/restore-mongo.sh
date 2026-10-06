#!/usr/bin/env bash
# ==============================================================================
# Glassofy MongoDB Restore Script
# Restores database from a compressed BSON archive.
# Usage: ./scripts/restore-mongo.sh <path-to-archive.gz>
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-archive.gz>"
  echo "Example: $0 ./scripts/mongo-backups/glassofy_backup_20261005_120000.gz"
  exit 1
fi

ARCHIVE_PATH="$1"
MONGO_CONTAINER="${MONGO_CONTAINER:-glassofy-mongo-prod}"
DB_NAME="${MONGO_DB:-glassofy}"
MONGO_USER="${MONGO_ROOT_USER:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-ChangeThisStrongPassword2026!}"

if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "ERROR: Backup archive not found at: ${ARCHIVE_PATH}"
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restoring MongoDB database '${DB_NAME}' from: ${ARCHIVE_PATH}..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
  ARCHIVE_FILENAME=$(basename "${ARCHIVE_PATH}")
  docker cp "${ARCHIVE_PATH}" "${MONGO_CONTAINER}:/backups/${ARCHIVE_FILENAME}"
  docker exec "${MONGO_CONTAINER}" mongorestore \
    --username "${MONGO_USER}" \
    --password "${MONGO_PASS}" \
    --authenticationDatabase admin \
    --nsInclude="${DB_NAME}.*" \
    --archive="/backups/${ARCHIVE_FILENAME}" \
    --gzip \
    --drop
elif command -v mongorestore >/dev/null 2>&1; then
  mongorestore \
    --uri="${MONGO_URI:-mongodb://localhost:27017/${DB_NAME}}" \
    --nsInclude="${DB_NAME}.*" \
    --archive="${ARCHIVE_PATH}" \
    --gzip \
    --drop
else
  echo "ERROR: Neither running Docker container '${MONGO_CONTAINER}' nor local 'mongorestore' binary was found."
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Database restoration completed successfully."
