#!/bin/sh
set -e

mkdir -p /app/data

echo "→ [1/3] Đồng bộ database schema..."
npx prisma db push --skip-generate --accept-data-loss=false 2>/dev/null \
  || npx prisma db push --skip-generate

echo "→ [2/3] Kiểm tra dữ liệu ban đầu..."
EXERCISE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const c = await p.exercise.count();
    console.log(c);
  } catch (e) {
    console.log(0);
  } finally {
    await p.\$disconnect();
  }
})();
" 2>/dev/null || echo "0")

if [ "$EXERCISE_COUNT" = "0" ]; then
  echo "  → Database trống, đang seed 213 bài tập + 6 templates..."
  npx tsx prisma/seed.ts || echo "  ⚠ Seed thất bại (sẽ thử lại lần sau)"
else
  echo "  → Đã có $EXERCISE_COUNT bài tập, bỏ qua seed"
fi

echo "→ [3/3] Khởi động ứng dụng tại port ${PORT:-3000}..."
exec "$@"
