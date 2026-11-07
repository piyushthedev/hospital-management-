#!/usr/bin/env bash
# ==============================================================================
# Automated SQLite Database Backup to Amazon S3
# Run via cron (e.g. daily at 2:00 AM)
# ==============================================================================

set -euo pipefail

BACKUP_BUCKET="${AWS_S3_BACKUP_BUCKET:-}"
DB_PATH="${DB_PATH:-/opt/hospital-management-system/data/hospital.db}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DIR="/tmp/hms_backup_${TIMESTAMP}"

if [ -z "$BACKUP_BUCKET" ]; then
    echo "ERROR: AWS_S3_BACKUP_BUCKET environment variable is not set."
    exit 1
fi

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database file not found at: $DB_PATH"
    exit 1
fi

mkdir -p "$TEMP_DIR"

echo ">>> Creating SQLite online backup..."
# Uses sqlite3 CLI or safe copy
if command -v sqlite3 &>/dev/null; then
    sqlite3 "$DB_PATH" ".backup '${TEMP_DIR}/hospital_${TIMESTAMP}.db'"
else
    cp "$DB_PATH" "${TEMP_DIR}/hospital_${TIMESTAMP}.db"
fi

echo ">>> Compressing backup..."
gzip "${TEMP_DIR}/hospital_${TIMESTAMP}.db"

echo ">>> Uploading to Amazon S3: s3://${BACKUP_BUCKET}/backups/hospital_${TIMESTAMP}.db.gz"
aws s3 cp "${TEMP_DIR}/hospital_${TIMESTAMP}.db.gz" "s3://${BACKUP_BUCKET}/backups/hospital_${TIMESTAMP}.db.gz" --sse AES256

# Cleanup temp files
rm -rf "$TEMP_DIR"

echo ">>> Backup completed successfully: hospital_${TIMESTAMP}.db.gz"

