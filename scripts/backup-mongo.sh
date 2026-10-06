#!/usr/bin/env bash
# ==============================================================================
# Glassofy MongoDB Automated Backup Script
# Creates compressed, timestamped BSON archives with 14-day retention cleanup.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./scripts/mongo-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="glassofy_backup_${TIMESTAMP}.gz"
MONGO_CONTAINER="${MONGO_CONTAINER:-glassofy-mongo-prod}"
DB_NAME="${MONGO_DB:-glassofy}"
MONGO_USER="${MONGO_ROOT_USER:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-ChangeThisStrongPassword2026!}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting MongoDB backup for database: ${DB_NAME}..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
  echo "Backing up via Docker container: ${MONGO_CONTAINER}..."
  docker exec "${MONGO_CONTAINER}" mongodump \
    --username "${MONGO_USER}" \
    --password "${MONGO_PASS}" \
    --authenticationDatabase admin \
    --db "${DB_NAME}" \
    --archive="/backups/${BACKUP_NAME}" \
    --gzip
  echo "Backup created inside container at: /backups/${BACKUP_NAME}"
elif command -v mongodump >/dev/null 2>&1; then
  echo "Backing up via local mongodump command..."
  mongodump \
    --uri="${MONGO_URI:-mongodb://localhost:27017/${DB_NAME}}" \
    --archive="${BACKUP_DIR}/${BACKUP_NAME}" \
    --gzip
  echo "Backup created at: ${BACKUP_DIR}/${BACKUP_NAME}"
else
  echo "ERROR: Neither running Docker container '${MONGO_CONTAINER}' nor local 'mongodump' binary was found."
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup successfully completed: ${BACKUP_NAME}"

# Retention Cleanup: remove archives older than 14 days
echo "Purging backups older than 14 days..."
find "${BACKUP_DIR}" -type f -name "glassofy_backup_*.gz" -mtime +14 -exec rm -f {} + || true
echo "Backup retention check finished."
