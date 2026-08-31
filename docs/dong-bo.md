# Sync Engine — đồng bộ 2 chiều SQLite ⇄ Supabase (M5)

Daemon Node chạy trên **máy nội bộ**, cứ mỗi ~20 giây đồng bộ 2 chiều giữa
`prisma/dev.db` (SQLite) và Postgres của Supabase.

- **Giải quyết xung đột**: Last-Write-Wins theo `updatedAt` (audit_log theo `atTime`).
  Bản thua được lưu vào `sync_conflict_log` để đối chiếu.
- **Xoá**: chỉ xoá mềm (`deletedAt`) — tombstone lan truyền như một thay đổi bình thường.
  Không bao giờ xoá cứng khi đồng bộ.
- **Khoá đồng bộ**: cột `id`. `users`/`vehicles` có `id` tất định (uuid v5 theo
  username / biển số) nên 2 CSDL trùng id → quan hệ khớp.
- Bảng đồng bộ: `users`, `vehicles`, `bookings`, `booking_approvals`,
  `booking_dispatch`, `trip_logs`, `odometer_events`, `alert_acks`, `audit_log`.
  Không đồng bộ: `sync_state` (watermark riêng của máy nội bộ).

---

## 1. BẮT BUỘC: nạp lại dữ liệu gốc với id tất định

Nếu 2 CSDL đã seed **trước M5** thì `users`/`vehicles` đang mang id ngẫu nhiên
khác nhau → đồng bộ sẽ lỗi trùng `username`. Làm sạch cả 2 bên **1 lần**:

**Máy nội bộ (SQLite):**
```bash
npm run db:reset          # xoá + migrate lại + seed (id tất định)
npm run db:seed:demo      # (tuỳ chọn) dữ liệu mẫu
```
> `db:reset` sẽ hỏi xác nhận vì nó xoá sạch DB — gõ `y`.

**Supabase (Postgres)** — chạy trên máy nội bộ, dùng chuỗi cổng 5432:
```powershell
$env:DATABASE_URL="<chuỗi Session pooler 5432>"; $env:DIRECT_URL=$env:DATABASE_URL
$env:ORIGIN_NODE="cloud"
npm run db:pg:reset       # db push --force-reset + seed
```

Sau bước này 2 bên có cùng 366 user + 4 xe với **cùng id**.

## 2. Cấu hình daemon

Chép `.env.sync.example` → `.env.sync`, điền:
```
SUPABASE_DB_URL="postgresql://postgres.xxxx:MẬT_KHẨU@aws-0-…pooler.supabase.com:5432/postgres"
```
(đúng chuỗi **Session pooler cổng 5432**, giống `DIRECT_URL` trên Vercel).

## 3. Chạy thử

```bash
npm run sync:once     # chạy đúng 1 vòng rồi thoát
npm run sync          # chạy liên tục (Ctrl+C để dừng)
```
Log mỗi vòng: `đẩy=<n> kéo=<n> xung_đột=<n>`.

Kiểm tra hội tụ: sửa 1 đơn trên bản Vercel → sau ~20 giây thấy thay đổi ở bản
nội bộ, và ngược lại. Xem tổng quan ở trang **Đồng bộ** (`/dong-bo`, chỉ `admin` / `admin_datxe`).

## 4. Chạy nền khi khởi động Windows

**Cách A — Task Scheduler (đơn giản):**
1. Task Scheduler → *Create Task*.
2. General: *Run whether user is logged on or not*.
3. Triggers: *At startup* (hoặc *At log on*).
4. Actions: *Start a program* → `G:\apptulam\datxe\sync\run-sync.bat`.
5. Settings: *If the task fails, restart every 1 minute*.

`run-sync.bat` tự khởi động lại daemon nếu nó thoát.

**Cách B — PM2:**
```bash
npm i -g pm2
pm2 start npm --name datxe-web -- start
pm2 start sync/daemon.mjs --name datxe-sync
pm2 save
npx @jessety/pm2-installer install    # cài PM2 làm dịch vụ Windows
```

## 5. Lưu ý

- **Chỉ chạy 1 daemon.** Không chạy trên nhiều máy cùng lúc.
- **Đồng bộ giờ máy nội bộ (NTP)** — LWW dựa vào đồng hồ. Windows: bật
  *Set time automatically*.
- Daemon chỉ chạy ở máy nội bộ; bản Vercel không cần daemon.
- Mất mạng: daemon ghi `sync_run` với lỗi "cloud unreachable" và thử lại vòng sau.
- Đổi schema (`prisma/schema.prisma`) về sau: `npm run db:migrate` (local) +
  `npm run db:pg:push` (cloud) + `npm run sync:test` để chắc engine vẫn đúng.

## Kiểm thử

`npm run sync:test` — dựng SQLite tạm + Postgres in-process (pglite), chạy các
kịch bản: tạo mới 2 chiều, xung đột (LWW + ghi log), tombstone, idempotent, hội tụ.
