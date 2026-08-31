# Kế hoạch — Hệ thống Đặt xe Công tác HTV

Bản trình bày đầy đủ (artifact): <https://claude.ai/code/artifact/7d2087b8-668c-4a0d-99d9-6c894135af92>

Tài liệu này là bản tham chiếu rút gọn đi kèm mã nguồn.

## Quyết định đã chốt

| | |
|---|---|
| Stack | Next.js (App Router, TS) + Prisma. 1 codebase cho local + Vercel. |
| DB | SQLite (local) ⇄ PostgreSQL/Supabase (cloud), đồng bộ 2 chiều Last-Write-Wins qua daemon Node chạy trên máy local. |
| Múi giờ | Hiển thị `Asia/Ho_Chi_Minh`, lưu UTC. |
| Đăng nhập | username + mật khẩu; seed toàn bộ `123456` (bcrypt). |
| Duyệt đơn | Chỉ `truong_ban` + `pho_ban` cùng `dsBan`. Trưởng/phó phòng không duyệt. |
| Lịch | Mọi người xem tất cả chuyến; nhân viên chỉ sửa/hủy đơn nháp của mình. |
| Xe/lái xe | Giai đoạn đầu 4 xe + 4 lái xe. 1 đơn = 1 xe. |
| Trùng lịch | Chỉ cảnh báo, vẫn cho lưu. |
| Nhiên liệu | Không theo dõi — chỉ km + thời gian. |
| Hủy đơn | Chưa duyệt → người tạo hủy. Đã điều xe → chỉ Trưởng/Phó Ban Văn phòng Đài. |
| Thông báo | Trong app: chuông cạnh tên + badge sidebar. |

## Vai trò

| Vai trò app | Nguồn (`ds_vai_tro` / `JobTitles`) | Quyền chính |
|---|---|---|
| `nhan_vien` | `nhan_vien` | Tạo đơn, xem tất cả, sửa/hủy đơn nháp của mình |
| `truong_ban`, `pho_ban` | như tên | + duyệt đơn của đúng `dsBan` |
| `truong_phong`, `pho_phong` | `truong_phong`, `pho_phong`/`Pho_phong` | như nhân viên (không duyệt) |
| `to_truong`, `to_pho` | như tên | Điều xe, gán xe+lái xe, dashboard, thống kê, cảnh báo gian lận |
| `lai_xe` | `nhan_vien` + `JobTitles = Lái xe` → `isDriver` | Xem chuyến được phân, nhập công-tơ-mét + giờ, tạo đơn phát sinh |
| `ban_tgd` | `BanTGD` | Xem tất cả + thống kê (chỉ đọc) |
| `admin` | `admin` | Quản trị user/xe/cấu hình, xem log đồng bộ |

## Trạng thái đơn & màu

| `status` | Màu | Ý nghĩa |
|---|---|---|
| `nhap` | — | Nháp, chưa gửi |
| `cho_ban_duyet` | Xám | Vừa gửi, chờ Ban |
| `ban_tu_choi` | Đỏ | Ban từ chối |
| `cho_doi_xe` | Cam | Ban đã duyệt |
| `doi_xe_tu_choi` | Đỏ | Đội xe từ chối |
| `da_dieu_xe` | Xanh lá | Đã gán xe + lái xe |
| `dang_chay` | Xanh dương | Lái xe đã nhập km đầu |
| `hoan_thanh` | Xám xanh | Đã nhập km cuối, đóng chuyến |
| `huy` | Gạch ngang | Đã hủy |

## Mô hình dữ liệu

Chi tiết ở `prisma/schema.prisma`. Tóm tắt: `User`, `Vehicle`, `Booking` (lõi), `BookingApproval` (Ban ghi), `BookingDispatch` (Đội xe ghi), `TripLog` (lái xe ghi), `OdometerEvent`, `AuditLog`, và các bảng sync (`SyncRun`, `SyncConflictLog`, `SyncState`).

Nguyên tắc: mỗi bước quy trình là 1 bảng riêng do đúng 1 vai trò ghi → LWW gần như không đụng độ.

## Giai đoạn

- **M0 — xong**: repo Next.js + Prisma, schema, seed 366 user + 4 xe.
- **M1 — xong**: đăng nhập (username + 123456), proxy chặn route, layout + sidebar + chuông,
  lịch tuần (click ô giờ để đặt), mẫu đơn công tác, luồng duyệt Ban → điều xe (chọn xe + lái xe,
  cảnh báo trùng giờ mềm), hủy đơn theo quyền, đơn phát sinh, màu trạng thái, thông báo trong app.
- **M2 — xong**: lái xe nhập km + giờ xuất bến (prefill từ số km xe) → `dang_chay`;
  nhập km + giờ về → `hoan_thanh`, tự tính km, cập nhật số km xe. Chặn bắt đầu chuyến mới
  khi xe đang có chuyến chưa đóng. Trang `/cong-to-met`: cảnh báo km chạy ngoài đơn
  (sai số cho phép 1 km), bảng số km / số chuyến / km 30 ngày từng xe, Đội xe chỉnh số km gốc.
  Đội xe điều chỉnh km chuyến đã đóng (ghi `audit_log`). Không kiểm tra chéo thời gian–quãng đường.
- **M3 — xong**: `/thong-ke` — chọn kỳ (tháng / khoảng ngày / hôm nay); bảng theo lái xe (chuyến, phát sinh, km, giờ chạy, km chưa giải trình) và theo xe (km theo chuyến vs theo công-tơ-mét, chênh lệch); dòng thời gian công-tơ-mét từng xe (tô đỏ chỗ đứt quãng); trang chi tiết từng lái xe; xuất CSV (lái xe / xe); "In / Lưu PDF" qua `@media print`.
- **M3.1 — xong**: nhắc lái xe có chuyến đang chạy chưa đóng (banner toàn app + trang Chuyến của tôi + Thông báo + badge); `/dieu-xe` đầu trang liệt kê xe đang chạy chưa đóng chuyến (cờ "QUÁ GIỜ"); nút "Biết rồi" ẩn từng cảnh báo km chạy ngoài đơn (`?daxem=1` để xem lại / hiện lại).
- **M4 — sẵn sàng**: 1 lược đồ nguồn (`schema.prisma`), tự sinh `schema.postgres.prisma`
  cho cloud; `npm run build` tự chọn SQLite/Postgres theo `DATABASE_URL`; script
  `db:pg:push` / `db:pg:seed`; `viewport` + `manifest.webmanifest` (cài như app trên điện thoại);
  giao diện co theo màn hình điện thoại (form/nút full-width, nút thao tác lái xe to hơn).
  Hướng dẫn deploy từng bước: `docs/trien-khai.md`. *(Bước bấm nút deploy do bạn tự làm
  với tài khoản Vercel/Supabase của mình.)*
- **M5 — xong**: daemon `sync/daemon.mjs` (node:sqlite + pg, không dùng Prisma) đồng bộ 2 chiều
  theo `id`, LWW theo `updatedAt`/`atTime`, tombstone (`deletedAt`), ghi `sync_run` + `sync_conflict_log`
  vào cả 2 CSDL, watermark ở `sync_state` (local). Seed `users`/`vehicles` dùng id tất định (uuid v5).
  Trang `/dong-bo` theo dõi. `npm run sync` / `sync:once` / `sync:test` (test tích hợp với pglite, 6/6 pass).
  Chạy nền qua Task Scheduler (`sync/run-sync.bat`) hoặc PM2. Chi tiết: `docs/dong-bo.md`.
- **M6 — đang chạy**: `/quan-tri` (quản lý user + xe, bảng chất lượng dữ liệu: đếm tên trùng
  username, đơn vị thiếu Trưởng/Phó ban); danh sách nghiệm thu `docs/nghiem-thu.md`;
  hướng dẫn sử dụng theo vai trò. Phần còn lại (chạy song song, đào tạo, nghiệm thu) do bên vận hành.

## Việc dữ liệu còn lại (file `Danh sách_user.xlsx`)

1. 39 user có `full_name` trùng `username` — cần tên thật.
2. Bổ sung đủ Trưởng Ban + Phó Ban cho mọi đơn vị (logic duyệt phụ thuộc).
3. Chuẩn hóa `phone` (đang lẫn số nguyên, dấu chấm, số bị cắt).
4. Vài lỗi chính tả tên: `Nguuyễn Đức Mạnh`, `Đào Minh Tồng`, `doảtrinhthihuyentram`.
5. Dòng `admin` trống thông tin.
