# Deploy scripts

Các script tiện dụng cho server (Linux):

| File | Tác dụng |
|---|---|
| `update.sh` | Pull code mới + backup + rebuild + restart + dọn image cũ |
| `backup.sh` | Backup database vào `./backups/`, xoá file cũ hơn 30 ngày |
| `Caddyfile.example` | Mẫu config Caddy cho HTTPS auto + Basic Auth |

## Setup lần đầu trên server

```bash
chmod +x deploy/update.sh deploy/backup.sh

# Backup mỗi ngày 3:00 sáng
crontab -e
# Thêm dòng:
# 0 3 * * * /opt/gym-tracker/deploy/backup.sh >> /var/log/gym-backup.log 2>&1
```

## Update khi có code mới

```bash
cd /opt/gym-tracker
./deploy/update.sh
```

## Setup HTTPS (Caddy)

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # sửa domain
sudo systemctl reload caddy
```

Caddy tự xin cert Let's Encrypt — sau ~1 phút HTTPS hoạt động.
