# 🚀 Deployment & Operations Guide (Prod & Staging)

Tài liệu này cung cấp toàn bộ kiến trúc, quy trình triển khai (CI/CD), quản lý biến môi trường, bảo vệ cơ sở dữ liệu và cẩm nang xử lý sự cố cho hệ thống **Checkin App** trên **Contabo VPS**.

---

## 🏗️ 1. Kiến Trúc Hạ Tầng & Hai Môi Trường

Hệ thống hoạt động trên máy chủ **Contabo VPS** (`144.91.88.242`), phân định rõ ràng giữa **Production** (hiện hữu) và **Staging Canary** (thử nghiệm monorepo):

```mermaid
graph TD
    User["👤 Người dùng / Nhân viên"] --> CF["Cloudflare Full Strict SSL"]
    CF --> Caddy["🌐 Caddy 2 Reverse Proxy (ops_bridge)"]
    
    subgraph Production ["🚀 Production: limart.khanhdp.com"]
        Caddy -->|":3000"| ProdApp["checkin-app (Next.js Monolith)"]
    end

    subgraph Staging ["🧪 Staging Canary: limart2.khanhdp.com"]
        Caddy -->|"/api/* & /health*"| ApiV2["checkin-api-v2 (:4000)"]
        Caddy -->|"/admin*"| AdminV2["checkin-admin-v2 (:3001)"]
        Caddy -->|"/*"| StaffV2["checkin-staff-v2 (:3002)"]
    end

    subgraph BackingServices ["🗄️ Dịch Vụ Dùng Chung (ops_bridge)"]
        ProdApp --> DB[("checkin-db (PostgreSQL 17)")]
        ApiV2 -->|Dual-Run Read/Write (Zero Auto-Push)| DB
        ProdApp --> Cache[("checkin-valkey (Valkey 8)")]
        ApiV2 --> Cache
        ProdApp --> Search[("meilisearch (Port 7700)")]
        ApiV2 --> Search
        DB -.-> Backup[("pgBackRest Backups & WAL Archives")]
    end
```

### Chi Tiết Cấu Hình Hai Môi Trường:

| Thuộc tính | 🚀 Production | 🧪 Staging Canary |
| :--- | :--- | :--- |
| **Domain** | `https://limart.khanhdp.com` | `https://limart2.khanhdp.com` |
| **Thư mục VPS** | `/opt/checkin-app` | `/opt/checkin-staging` |
| **Git Branch** | `main` | `feat/monorepo-migration` |
| **Workflow CI/CD** | `.github/workflows/deploy.yml` | `.github/workflows/deploy-monorepo.yml` |
| **Docker Compose** | `docker-compose.yml` | `docker-compose.staging.yml` |
| **Container chính** | `checkin-app` (Next.js port 3000) | `checkin-api-v2` (port 4000)<br>`checkin-admin-v2` (port 3001)<br>`checkin-staff-v2` (port 3002) |
| **Chiến lược Deploy**| Rolling pull & container restart | **Blue-Green Atomic Container Swap** (Zero-Downtime) |
| **Database kết nối**| `checkin_db` (Port 5432) | `checkin_db` (Port 5432 - Dual-run kết nối trực tiếp) |
| **Quy định DB Schema**| Tự động sync qua `prisma db push` | **CẤM auto-push** để tránh làm biến dạng schema Production |

---

## 🔄 2. Quy Trình Triển Khai Tự Động (CI/CD Pipeline)

> [!IMPORTANT]
> **Tuyệt đối không tự ý build image hoặc chạy `docker compose up` thủ công qua SSH trên VPS.**
> Mọi thay đổi code đều phải commit lên GitHub để kích hoạt pipeline tự động, bảo đảm quy trình kiểm thử (Unit test + Build test).

### A. Triển khai lên Staging (`limart2.khanhdp.com`)
1. **Kiểm tra local trước khi push**:
   ```bash
   pnpm test
   ```
2. **Commit và Push lên nhánh `feat/monorepo-migration`**:
   ```bash
   git add -A
   git commit -m "feat/fix: <mô tả ngắn gọn>"
   git push origin feat/monorepo-migration
   ```
3. **Pipeline `.github/workflows/deploy-monorepo.yml` sẽ tự động**:
   - Chạy test toàn bộ monorepo (`@checkin/shared`, `@checkin/audit-trail`, `@checkin/api`, `@checkin/staff-pwa`).
   - Build và push Docker images (`checkin-api:staging`, `checkin-admin:staging`, `checkin-staff:staging`) lên GitHub Container Registry (GHCR).
   - SSH vào VPS kích hoạt script `scripts/deploy-staging.sh`:
     - Khởi chạy candidate container `checkin-api-v2_next`.
     - Chờ healthcheck `/health` phản hồi `status: ok` (timeout 45s).
     - Đổi tên atomic: `checkin-api-v2` ➡️ `checkin-api-v2_old`, `checkin-api-v2_next` ➡️ `checkin-api-v2`.
     - Reload Caddy reverse proxy không downtime.
     - Tự động dọn dẹp container cũ sau khi drain kết nối.

### B. Triển khai lên Production (`limart.khanhdp.com`)
1. **Kiểm tra unit tests và build local**:
   ```bash
   npm run test
   npm run build
   ```
2. **Merge hoặc Push lên nhánh `main`**:
   ```bash
   git checkout main
   git merge feat/monorepo-migration
   git push origin main
   ```
3. **Pipeline `.github/workflows/deploy.yml` sẽ tự động**:
   - Chạy test và build image trên GitHub runner.
   - SSH vào VPS `/opt/checkin-app`: pull image mới, restart `checkin-app`.
   - Đồng bộ schema DB an toàn với `prisma db push --skip-generate`.

---

## 🛠️ 3. Quản Lý Biến Môi Trường & GitHub Secrets

Toàn bộ bí mật và biến môi trường production được quản lý tập trung tại **GitHub Actions Repository Secrets** và tự động sinh file `.env` trên VPS khi deploy:

| Tên Secret | Mục Đích | Giá Trị Mẫu / Chú Thích |
| :--- | :--- | :--- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL 17 | `postgresql://kido:...@checkin-db:5432/checkin_db?sslmode=disable` |
| `NEXTAUTH_SECRET` | Secret mã hoá JWT token phiên đăng nhập | Khóa ngẫu nhiên 32+ ký tự |
| `NEXTAUTH_URL` | Domain chính thức của Production | `https://limart.khanhdp.com` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID từ Google Cloud Console | Dùng đăng nhập Google |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret | Dùng đăng nhập Google |
| `GEMINI_API_KEY` | Khóa API Gemini cho AI Assistant (Capy) | Google AI Studio key |
| `RESEND_API_KEY` | Khóa API gửi email thông báo | Khóa Resend |
| `EMAIL_FROM` | Địa chỉ email người gửi | `LimArt <no-reply@khanhdp.com>` |
| `CRON_SECRET` | Secret xác thực các API Cron tự động | Dùng cho cron triggers |
| `VPS_HOST` | Địa chỉ IP máy chủ Contabo | `144.91.88.242` |
| `SSH_USER` | Tên người dùng SSH | `root` |
| `SSH_PRIVATE_KEY` | Private SSH key kết nối VPS | Ed25519 / RSA key |

> [!TIP]
> **Thêm Secret Mới Bằng GitHub CLI (`gh`)**:
> ```bash
> gh secret set TEN_BIEN_MOI --body "gia_tri_secret"
> ```
> Sau khi thêm secret trên GitHub, hãy cập nhật danh sách `env` và `envs` trong `.github/workflows/deploy.yml` để file `.env` trên VPS nhận giá trị mới.

---

## 🛡️ 4. An Toàn Cơ Sở Dữ Liệu & pgBackRest

### A. Những Điều TUYỆT ĐỐI KHÔNG LÀM:
- ❌ **CẤM** chạy `npx prisma migrate reset` hoặc `npx prisma db push --force-reset` trên production.
- ❌ **CẤM** xoá volume `checkin_pgdata` hoặc chạy `docker volume prune -a` trên VPS.
- ❌ **CẤM** cấu hình auto db-push trên Staging khi đang trỏ vào database Production chung!

### B. Cơ Chế Sao Lưu pgBackRest
- Database container `checkin-db` tự động ghi nhận **WAL archives** liên tục vào volume `checkin_pgbackrest_data`.
- Cho phép phục hồi dữ liệu về bất kỳ thời điểm nào trong quá khứ (**Point-in-Time Recovery - PITR**).
- Xem hướng dẫn chi tiết tại [docs/PGBACKREST_RUNBOOK.md](file:///Users/kido/checkin-app/docs/PGBACKREST_RUNBOOK.md).

---

## 🔍 5. Kiểm Tra Trạng Thái & Xem Logs Nhanh

Khi cần kiểm tra trạng thái hoặc tìm nguyên nhân lỗi, chỉ cần thực hiện các lệnh **Read-Only** an toàn sau:

### Kiểm tra tình trạng hoạt động (Health check):
```bash
# Kiểm tra Prod
curl -sI https://limart.khanhdp.com | head -n 5

# Kiểm tra Staging
curl -s https://limart2.khanhdp.com/health
```

### Xem logs trực tiếp qua terminal (Dùng SSH alias `ssh contabo`):
```bash
# Xem 100 dòng log gần nhất của Prod
ssh contabo "docker logs --tail 100 -f checkin-app"

# Xem logs của Staging API v2
ssh contabo "docker logs --tail 100 -f checkin-api-v2"

# Xem logs của Database
ssh contabo "docker logs --tail 50 checkin-db"

# Xem logs của Cache Valkey
ssh contabo "docker logs --tail 50 checkin-valkey"
```

### Xem trực quan qua giao diện web:
- **Dozzle (Xem live logs)**: [https://dozzle.khanhdp.com](https://dozzle.khanhdp.com) (Tìm container `checkin-app` hoặc `checkin-api-v2`)
- **Beszel (Xem RAM, CPU)**: [https://beszel.khanhdp.com](https://beszel.khanhdp.com)
- **Uptime Kuma (Uptime monitor)**: [https://kuma.khanhdp.com](https://kuma.khanhdp.com)

---

## 🚑 6. Xử Lý Khẩn Cấp (Emergency Playbook)

### Kịch bản 1: Container Prod bị treo / không phản hồi
Nếu web `limart.khanhdp.com` báo 502 Bad Gateway:
```bash
ssh contabo "docker restart checkin-app"
```

### Kịch bản 2: Container Staging v2 bị lỗi
Nếu `limart2.khanhdp.com` báo lỗi:
```bash
ssh contabo "docker restart checkin-api-v2 checkin-admin-v2 checkin-staff-v2"
```

### Kịch bản 3: Caddy Reverse Proxy không nhận route mới
```bash
ssh contabo "docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
```

### Kịch bản 4: Rollback phiên bản trước trên Production
1. Vào tab **Actions** trên GitHub repository: `https://github.com/khanhduong22/checkin-app/actions`.
2. Chọn workflow chạy thành công gần nhất trước đó.
3. Nhấn **Re-run all jobs** để deploy lại bản ổn định.
