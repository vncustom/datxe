# Datxe — Hệ thống Đặt xe Công tác HTV

Ứng dụng web quản lý đặt xe đi công tác cho các đơn vị trong Đài Truyền hình.
Kế hoạch đầy đủ: xem `docs/ke-hoach.md` (bản artifact) — dưới đây là phần dev cần biết.

## Kiến trúc

- **1 codebase** Next.js (App Router, TS) + Prisma, chạy 2 nơi:
  - **local**: `next start` trên IP nội bộ, DB = SQLite (`prisma/dev.db`).
  - **cloud**: Vercel, DB = PostgreSQL/Supabase (M4).
- **Sync Engine** (M5): daemon Node chạy trên máy local, đồng bộ 2 chiều SQLite ⇄ Supabase theo Last-Write-Wins. Mọi bảng đồng bộ có `updatedAt`, `updatedBy`, `originNode` (`local`/`cloud`), `deletedAt` (xoá mềm — KHÔNG xoá cứng). Quan hệ tới `User` tham chiếu theo `username` để ổn định giữa 2 DB.
- Múi giờ nghiệp vụ cố định `Asia/Ho_Chi_Minh`; **luôn lưu DateTime ở UTC**.

## Vai trò (`User.role`)

`nhan_vien` · `truong_ban` · `pho_ban` · `truong_phong` · `pho_phong` · `to_truong` · `to_pho` · `ban_tgd` · `admin`.
Lái xe = `role: nhan_vien` + `isDriver: true` (`laixe1`–`laixe4`).

- **Duyệt đơn**: chỉ `truong_ban` / `pho_ban` cùng `dsBan` với người tạo. Trưởng/phó phòng KHÔNG duyệt.
- **Điều xe**: `to_truong` / `to_pho` (Đội xe, thuộc "Văn Phòng Đài").
- **Hủy sau khi đã điều xe**: chỉ `truong_ban` / `pho_ban` của `dsBan = "Văn Phòng Đài"`.

## Trạng thái đơn (`Booking.status`)

`nhap` → `cho_ban_duyet` (xám) → `cho_doi_xe` (cam) → `da_dieu_xe` (xanh lá) → `dang_chay` (xanh dương) → `hoan_thanh` (xám xanh).
Từ chối: `ban_tu_choi` / `doi_xe_tu_choi` (đỏ). Hủy: `huy`. Đơn phát sinh: `isPhatSinh = true`, bỏ qua bước Ban.

## Cấu trúc code (M1)

- `lib/` — lõi không phụ thuộc UI:
  - `jwt.ts` (ký/verify session, edge-safe), `auth.ts` (login/logout/getSession, server-only),
    `rbac.ts` (vai trò + quyền), `status.ts` (trạng thái + màu), `tz.ts` (giờ VN, pure Intl),
    `bookings.ts` (mã đơn, include, dò bận), `notifications.ts` (badge).
- `proxy.ts` — chặn route chưa đăng nhập (thay cho `middleware.ts`, đã đổi tên theo Next 16).
- `app/login/` — đăng nhập.
- `app/(app)/` — khu vực đã đăng nhập: layout có sidebar + chuông.
  - `lich/` lịch tuần, `don/moi` tạo đơn, `don/[id]` chi tiết + panel duyệt/điều xe/hủy/nhật ký chuyến,
    `duyet/` hàng đợi Ban, `dieu-xe/` hàng đợi Đội xe, `cua-toi/` đơn của tôi,
    `chuyen-cua-toi/` chuyến của lái xe (nhập công-tơ-mét), `cong-to-met/` dashboard công-tơ-mét,
    `thong-bao/`, `thong-ke/` dashboard thống kê (+ `lai-xe/[username]`, `export` route CSV).
  - `_actions/booking.ts` — tạo / duyệt / điều xe / hủy đơn (state machine).
  - `_actions/trip.ts` — bắt đầu chuyến / đóng chuyến / điều chỉnh km / đặt số km xe.
- `lib/odometer.ts` — hằng số (`KM_DAILY_WARN` 400, `GAP_TOLERANCE_KM` 1), dò khoảng trống
  công-tơ-mét, tổng hợp số km / km 30 ngày từng xe.
- `lib/stats.ts` — `parseRange` (query → khoảng ngày), thống kê theo lái xe / xe / dòng thời gian,
  chi tiết chuyến 1 lái xe. Km "chưa giải trình" = gap công-tơ-mét gán cho chuyến sau.
- **Sync Engine (M5)** — `sync/daemon.mjs` (+ `engine.mjs`, `lib.mjs`, `manifest.mjs`). Dùng
  `node:sqlite` (built-in) + `pg`, KHÔNG Prisma (2 provider). Đồng bộ 2 chiều theo `id`,
  LWW theo `updatedAt`/`atTime`, tombstone `deletedAt`, watermark trong `sync_state` (local).
  `lib/uuid.ts` sinh id tất định cho user/vehicle. `/dong-bo` = trang theo dõi.
  Test: `npm run sync:test` (pglite in-process). Vận hành: `docs/dong-bo.md`.
- `@media print` trong `globals.css` ẩn sidebar/header/`.no-print` để in trang thống kê.
- `lib/bookings.ts#getOpenTrips` — chuyến `dang_chay` chưa đóng (cờ `overdue` nếu quá giờ
  dự kiến hoặc > 12 giờ). Dùng ở `/dieu-xe` (đầu trang) và banner lái xe trong layout.
- Cảnh báo km chạy ngoài đơn có nút "Biết rồi": bảng `alert_acks` (`kind`=`odo_gap`,
  `refId`=bookingId chuyến sau); `_actions/alert.ts` (`ackOdoAlertAction` / `unackOdoAlertAction`,
  chỉ Đội xe). `/cong-to-met?daxem=1` xem lại các cảnh báo đã bỏ qua.

## Local vs Cloud (M4)

- Nguồn lược đồ DUY NHẤT: `prisma/schema.prisma` (SQLite). `scripts/pg-schema.mjs` sinh
  `prisma/schema.postgres.prisma` (chỉ khác khối `datasource`, thêm `directUrl`).
- `scripts/prisma-generate.mjs` (chạy trong `postinstall` + `build`) tự chọn lược đồ theo
  `DATABASE_URL`: `postgres://…` → Postgres, còn lại → SQLite. Nhờ vậy `npm run build`
  dùng chung cho máy local và Vercel.
- Cloud không dùng migration history — dùng `npm run db:pg:push`. Chi tiết: `docs/trien-khai.md`.
- `app/manifest.ts` + `viewport`/`themeColor` trong `app/layout.tsx` → cài như app trên điện thoại.

## Lệnh

```bash
npm run dev            # dev server (port 3000)
npm run import:users   # đọc lại Danh sách_user.xlsx -> prisma/data/users.json (cần Python + openpyxl)
npm run db:migrate     # prisma migrate dev (SQLite local)
npm run db:seed        # seed 366 user (mật khẩu 123456) + 4 xe
npm run db:seed:demo   # ~9 đơn mẫu để xem thử luồng (createdBy = __demo__, chạy lại được)
npm run db:studio      # Prisma Studio
npm run db:pg:push     # đẩy schema lên Postgres (cần DATABASE_URL/DIRECT_URL trỏ Supabase, cổng 5432)
npm run db:pg:seed     # seed lên Postgres
npm run typecheck      # tsc --noEmit
```

## Lưu ý

- **Prisma pin ở 6.19.3** (không nâng lên 7/8: Prisma 7 bỏ `url` trong schema, đổi sang driver adapter). Bỏ qua banner "Update available".
- `npm audit`: 3 cảnh báo `deepmerge-ts` đến từ `@prisma/config` (CLI-time, không vào runtime app) — chấp nhận được, sẽ hết khi Prisma bump dep.
- `prisma/data/users.json` bị gitignore (chứa PII) — tạo lại bằng `npm run import:users`.
- Không dùng `enum` trong schema (SQLite không hỗ trợ) — các trường role/status/quyetDinh là `String`.

@AGENTS.md
