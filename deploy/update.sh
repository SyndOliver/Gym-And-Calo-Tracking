#!/bin/bash
# ============================================================
# Script cập nhật Gym Tracker lên phiên bản mới nhất
# Đặt tại /opt/gym-tracker/update.sh, chmod +x rồi chạy
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Pull code mới..."
git pull --ff-only

echo "→ Backup database trước khi update..."
mkdir -p backups
docker run --rm \
  -v gym_data:/data \
  -v "$(pwd)/backups:/backup" \
  alpine \
  tar czf "/backup/auto-$(date +%Y%m%d-%H%M).tar.gz" -C /data .

echo "→ Build & deploy phiên bản mới..."
docker compose up -d --build

echo "→ Dọn image cũ..."
docker image prune -f

echo "→ Giữ 10 backup gần nhất..."
ls -t backups/auto-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm

echo "✓ Update hoàn thành!"
docker compose ps
