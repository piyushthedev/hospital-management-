#!/usr/bin/env bash
# ==============================================================================
# Automated SQLite Database Backup and Rotation
# Run via cron (e.g. daily at 2:00 AM)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hospital}"
DB_PATH="${DB_PATH:-/opt/hospital-management-system/data/hospital.db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hospital_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database file not found at: $DB_PATH"
    exit 1
fi

echo ">>> Creating SQLite safe backup..."
if command -v sqlite3 &>/dev/null; then
    sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
else
    cp "$DB_PATH" "${BACKUP_FILE}"
fi

echo ">>> Compressing backup..."
gzip -f "${BACKUP_FILE}"

echo ">>> Backup created successfully: ${BACKUP_FILE}.gz"

# Rotate backups older than retention days
echo ">>> Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "hospital_*.db.gz" -mtime +"${RETENTION_DAYS}" -delete

echo ">>> Backup and retention cleanup completed."
