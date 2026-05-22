# 💪 Gym Tracker

Ứng dụng web theo dõi buổi tập gym - tự host, chạy bằng Docker, dữ liệu lưu local trên server của bạn.

## ✨ Tính năng

- 📚 **Thư viện bài tập** - 70+ bài tập tiếng Việt theo nhóm cơ (Ngực, Lưng, Chân, Vai, Tay, Bụng, Cardio)
- 🏋️ **Log workout** - Ghi sets / reps / weight, tự tính volume
- ⏱️ **Đồng hồ nghỉ** - Bộ đếm thời gian giữa set, có âm thanh + rung khi hết giờ
- 📋 **Templates** - Push / Pull / Legs, Upper / Lower, Full Body... + tự tạo template riêng
- 📊 **Thống kê & PR** - Biểu đồ volume 30 ngày, top Personal Records, e1RM
- 📅 **Lịch tập** - Xem lịch theo tháng, hiển thị nhóm cơ tập từng ngày
- ⚖️ **Body metrics** - Theo dõi cân nặng, body fat, số đo cơ thể + biểu đồ tiến triển
- 🔥 **Streak** - Đếm chuỗi ngày tập liên tiếp
- 📱 **Mobile-first** - Tối ưu cho điện thoại, có thể cài như app (PWA)
- 🌙 **Dark mode** - Giao diện tối hiện đại

## 🚀 Chạy bằng Docker (cách dễ nhất)

> 📖 **Deploy lên server đã có Docker?** Xem hướng dẫn chi tiết ở [DEPLOY.md](./DEPLOY.md)

### Yêu cầu

- Docker + Docker Compose

### Khởi động

```bash
docker compose up -d --build
```

App chạy tại `http://localhost:3000`. Lần đầu chạy sẽ tự động:
- Tạo database SQLite trong volume `gym_data`
- Seed sẵn 213 bài tập + 6 template (Push/Pull/Legs, Upper/Lower, Full Body)

### Đổi port

Tạo file `.env` cùng thư mục `docker-compose.yml`:

```env
PORT=8080
TZ=Asia/Ho_Chi_Minh
```

### Backup dữ liệu

Dữ liệu nằm trong Docker volume `gym_data`. Backup:

```bash
docker run --rm -v gym_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/gym-backup-$(date +%Y%m%d).tar.gz -C /data .
```

Restore:

```bash
docker run --rm -v gym_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/gym-backup-YYYYMMDD.tar.gz -C /data
```

### Xem logs

```bash
docker compose logs -f gym-tracker
```

### Dừng / khởi động lại

```bash
docker compose stop      # dừng
docker compose start     # chạy lại
docker compose down      # xoá container (volume vẫn giữ data)
docker compose down -v   # XOÁ TẤT CẢ data (cẩn thận!)
```

## 💻 Chạy local (development)

### Yêu cầu

- Node.js 22+
- npm 10+

### Cài đặt

```bash
npm install
cp .env.example .env
npm run db:push       # tạo database
npm run db:seed       # seed bài tập + template
npm run dev
```

App chạy tại `http://localhost:3000`.

### Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Build production |
| `npm start` | Chạy production build |
| `npm run db:push` | Tạo / đồng bộ schema |
| `npm run db:seed` | Seed dữ liệu mẫu |
| `npm run db:studio` | Mở Prisma Studio (xem DB) |

## 🛠️ Tech stack

- **Next.js 15** (App Router, Server Actions)
- **TypeScript** + **Tailwind CSS**
- **Prisma ORM** + **SQLite**
- **Recharts** - biểu đồ
- **Lucide Icons**

## 📂 Cấu trúc

```
src/
├── app/
│   ├── actions/         # Server actions (workout, exercise, body, template)
│   ├── workout/[id]/    # Trang tập đang diễn ra (log sets + rest timer)
│   ├── exercises/       # Thư viện bài tập
│   ├── templates/       # Quản lý template
│   ├── stats/           # Thống kê + PR
│   ├── body/            # Body metrics
│   ├── calendar/        # Lịch tập
│   └── page.tsx         # Trang chủ
├── components/          # React components
└── lib/                 # Prisma client + utils
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Dữ liệu mẫu (bài tập + templates)
```

## 📱 Cài như app trên điện thoại

1. Mở app trên trình duyệt mobile (Chrome/Safari)
2. Bấm menu trình duyệt → "Add to Home Screen" / "Cài vào màn hình chính"
3. Mở app từ icon trên màn hình - hoạt động như native app

## 🔐 Lưu ý bảo mật

App **không có authentication**. Khi deploy public:

- Đặt sau **reverse proxy** (Nginx, Caddy, Traefik) với HTTP Basic Auth
- Hoặc dùng **Cloudflare Tunnel + Access** để chỉ mình bạn truy cập
- Hoặc deploy trong mạng nội bộ / VPN (Tailscale, WireGuard)

## 📄 License

MIT - Tự do sử dụng cho cá nhân và thương mại.
