# 🚀 Deploy Gym Tracker lên server

Hướng dẫn deploy lên server có sẵn Docker. Mất khoảng **5-10 phút**.

---

## Bước 1: Đưa code lên server

### Cách A: Dùng Git (khuyên dùng)

Nếu bạn đã push code lên GitHub/GitLab:

```bash
ssh user@your-server-ip
cd /opt   # hoặc thư mục bạn muốn
git clone https://github.com/your-username/gym-tracker.git
cd gym-tracker
```

### Cách B: Copy thẳng từ máy bạn (không cần Git)

Trên máy Windows của bạn (PowerShell), gói project và scp:

```powershell
# Tạo file zip (bỏ node_modules + .next)
$exclude = @('node_modules', '.next', 'data', '.env', 'prisma\dev.db*')
Compress-Archive -Path * -DestinationPath gym-tracker.zip -Force
# (hoặc dùng tar nếu có WSL)

# Copy lên server
scp gym-tracker.zip user@your-server-ip:/opt/

# SSH vào và giải nén
ssh user@your-server-ip
cd /opt
mkdir gym-tracker && cd gym-tracker
unzip ../gym-tracker.zip
```

### Cách C: Build image local rồi push (nếu server không build được)

```powershell
# Trên máy bạn:
docker build -t gym-tracker:latest .
docker save gym-tracker:latest | gzip > gym-tracker.tar.gz
scp gym-tracker.tar.gz user@your-server-ip:/tmp/

# Trên server:
ssh user@your-server-ip
docker load < /tmp/gym-tracker.tar.gz
# Sau đó dùng docker-compose như bình thường (đã có image local)
```

---

## Bước 2: Build & chạy

Trên server:

```bash
cd /opt/gym-tracker
docker compose up -d --build
```

Lần đầu sẽ mất 2-5 phút build. Theo dõi:

```bash
docker compose logs -f gym-tracker
```

Khi thấy log `→ [3/3] Khởi động ứng dụng tại port 3000...` là OK.

Test:

```bash
curl http://localhost:3000
# Nếu thấy HTML trả về là chạy ngon
```

App giờ chạy tại `http://your-server-ip:3000`.

---

## Bước 3: Mở firewall (nếu cần)

### Ubuntu / Debian (UFW)

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### CentOS / RHEL (firewalld)

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

Truy cập từ điện thoại / máy khác: `http://your-server-ip:3000`

---

## Bước 4 (tuỳ chọn): Đổi port

Tạo file `.env` cùng thư mục `docker-compose.yml`:

```bash
echo "PORT=8080" > .env
echo "TZ=Asia/Ho_Chi_Minh" >> .env
docker compose down
docker compose up -d
```

---

## Bước 5 (tuỳ chọn): HTTPS với Caddy

Caddy tự động xin cert Let's Encrypt — không cần config thủ công.

### Cài Caddy

**Ubuntu/Debian:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Tạo file Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Nội dung (thay `gym.example.com` bằng domain bạn trỏ về server):

```
gym.example.com {
    reverse_proxy localhost:3000

    # (Tuỳ chọn) Basic auth - chỉ mình bạn vào được
    # Tạo password hash:  caddy hash-password
    # basicauth {
    #     yourname JDJhJDE0...your_hashed_pwd
    # }

    encode gzip
    log {
        output file /var/log/caddy/gym.log
        format console
    }
}
```

### Restart Caddy

```bash
sudo systemctl reload caddy
```

Caddy sẽ tự xin cert HTTPS trong vòng 1 phút. Truy cập `https://gym.example.com` — auto HTTPS.

---

## Cập nhật code lên phiên bản mới

```bash
cd /opt/gym-tracker
git pull                            # nếu dùng git
docker compose up -d --build        # rebuild + restart
docker image prune -f               # dọn image cũ
```

Data trong volume `pg_data` được giữ nguyên.

---

## Backup dữ liệu

### Backup nhanh (file .tar.gz)

```bash
docker run --rm \
  -v pg_data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/gym-backup-$(date +%Y%m%d-%H%M).tar.gz -C /data .
```

File backup nằm cùng thư mục, đặt cron để chạy mỗi tối:

```bash
crontab -e
# Backup mỗi ngày lúc 3:00 sáng
0 3 * * * cd /opt/gym-tracker && docker run --rm -v pg_data:/data -v /opt/backups:/backup alpine tar czf /backup/gym-$(date +\%Y\%m\%d).tar.gz -C /data . && find /opt/backups -name "gym-*.tar.gz" -mtime +30 -delete
```

(Lệnh trên cũng tự xoá backup cũ hơn 30 ngày)

### Restore

```bash
docker compose down
docker run --rm \
  -v pg_data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/gym-backup-YYYYMMDD-HHMM.tar.gz -C /data"
docker compose up -d
```

### Copy file SQLite ra ngoài để backup tay

```bash
docker cp gym-tracker:/app/data/gym.db ./gym-$(date +%Y%m%d).db
```

---

## Lệnh hữu ích

```bash
# Xem trạng thái
docker compose ps

# Xem logs realtime
docker compose logs -f gym-tracker

# Xem 200 dòng log gần nhất
docker compose logs --tail=200 gym-tracker

# Restart không downtime quá lâu
docker compose restart gym-tracker

# Dừng (data vẫn giữ)
docker compose stop

# Khởi động lại
docker compose start

# Dừng + xoá container (data vẫn giữ trong volume)
docker compose down

# XOÁ TẤT CẢ kể cả data (cẩn thận!!)
docker compose down -v

# Vào shell trong container để debug
docker compose exec gym-tracker sh

# Xem dung lượng volume
docker system df -v | grep pg_data
```

---

## Troubleshooting

### Build báo lỗi "no space left"

```bash
docker system prune -af --volumes
```

### Container restart liên tục

```bash
docker compose logs --tail=100 gym-tracker
# Đọc lỗi, thường là do schema/migration
```

Nếu DB hỏng, có thể reset (mất data):

```bash
docker compose down -v
docker compose up -d
```

### Quên xoá file `.env` cũ trên server

```bash
ls -la .env*
# Đảm bảo chỉ có .env (không có .env.local cũ)
```

### Port 3000 đã bị chiếm

```bash
# Cách 1: tìm và kill app đang dùng port
sudo lsof -i :3000
# Cách 2: dùng port khác
echo "PORT=8080" > .env
docker compose up -d
```

### Server có ARM (Raspberry Pi, Oracle ARM, AWS Graviton)

Dockerfile đã dùng `node:22-alpine` — tự động chọn architecture đúng. Build có thể chậm hơn x86, lần đầu có thể mất 10-15 phút.

---

## Khuyến nghị bảo mật

App **không có authentication** — ai vào URL cũng dùng được. Khi public ra Internet:

1. **Caddy basic auth** (như Bước 5) — đơn giản nhất, đủ dùng cho 1 user
2. **Cloudflare Tunnel + Access** — không cần mở port, chỉ email bạn đăng nhập được
3. **VPN nội bộ** (Tailscale, WireGuard, ZeroTier) — chỉ thiết bị trong VPN truy cập được
4. **Đặt sau Authelia / Authentik** — nếu cần OAuth/2FA

Tuyệt đối **đừng để port 3000 lộ thẳng ra Internet** mà không có 1 trong các lớp trên.
