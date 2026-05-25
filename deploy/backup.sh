#!/bin/bash
# ============================================================
# Script backup Gym Tracker database
# Đặt vào cron: 0 3 * * * /opt/gym-tracker/deploy/backup.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M)

mkdir -p "$BACKUP_DIR"

echo "→ Backup database..."
docker run --rm \
  -v pg_data:/data \
  -v "$(realpath "$BACKUP_DIR"):/backup" \
  alpine \
  tar czf "/backup/gym-${TIMESTAMP}.tar.gz" -C /data .

echo "→ Xoá backup cũ hơn ${KEEP_DAYS} ngày..."
find "$BACKUP_DIR" -name "gym-*.tar.gz" -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

SIZE=$(du -h "$BACKUP_DIR/gym-${TIMESTAMP}.tar.gz" | cut -f1)
echo "✓ Backup xong: gym-${TIMESTAMP}.tar.gz ($SIZE)"
