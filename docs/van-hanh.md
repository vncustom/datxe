# Cẩm nang vận hành — 6 câu hỏi thường gặp

Áp dụng cho: bản nội bộ (SQLite) + bản cloud (Vercel/Supabase) + daemon đồng bộ.

Mọi lệnh chạy trong **PowerShell**, tại thư mục dự án (`cd G:\apptulam\datxe`).
Sau khi kết thúc mỗi phiên có set `$env:DATABASE_URL`, nhớ đóng cửa sổ PowerShell hoặc
`Remove-Item Env:DATABASE_URL, Env:DIRECT_URL, Env:ORIGIN_NODE`.

---

## 1. Chuyển bản local từ máy nhà sang máy cơ quan

**Chép nguyên thư mục có chạy được không?** — Được, nhưng **đừng chép `node_modules`**
(nặng, chứa file nhị phân theo máy/hệ điều hành). Cách sạch nhất là lấy code từ GitHub.

### Chuẩn bị máy cơ quan
- Cài **Node.js** (cùng dòng với máy hiện tại — hiện đang Node 25; tối thiểu Node 22 để có `node:sqlite`).
- Cài **Git**. (Cài **Python + `pip install openpyxl`** nếu cần chạy `npm run import:users`.)

### Các bước
1. **Máy nhà** — dừng web + daemon, đẩy nốt dữ liệu lên Supabase:
   ```powershell
   npm run sync:once
   ```
   Sau đó **không chạy web/sync trên máy nhà nữa**.

2. **Máy cơ quan** — lấy code:
   ```powershell
   git clone https://github.com/vncustom/datxe.git
   cd datxe
   npm install
   ```

3. Tạo 2 file cấu hình (không có trong Git):
   - `.env` — chép từ `.env.example`, điền:
     ```
     DATABASE_URL="file:./dev.db"
     APP_TZ="Asia/Ho_Chi_Minh"
     ORIGIN_NODE="local"
     AUTH_SECRET="<chuỗi ngẫu nhiên dài>"
     ```
   - `.env.sync` — chép từ `.env.sync.example`, điền `SUPABASE_DB_URL` (chuỗi Session pooler cổng 5432).

4. Dựng CSDL nội bộ rỗng rồi kéo toàn bộ dữ liệu từ Supabase về:
   ```powershell
   npm run db:migrate
   npm run sync:reset
   npm run sync:once
   npm run sync:once   # chạy 2–3 lần cho chắc, đến khi thấy "đẩy=0 kéo=0"
   npm run db:verify   # kiểm tra: 366 user, 4 xe, và các đơn đã về
   ```
   > Nếu muốn giữ luôn dữ liệu SQLite của máy nhà: chép **1 file** `prisma/dev.db`
   > sang máy cơ quan (thay cho bước `db:migrate`), rồi `npm run sync:once`.

5. Chạy:
   ```powershell
   npm run build
   npm run start        # hoặc npm run dev
   npm run sync         # cửa sổ PowerShell thứ 2
   ```

6. **Địa chỉ truy cập đổi** (IP máy mới khác). Xem IP: `ipconfig` → dòng *IPv4 Address*.
   Báo lại cho mọi người `http://IP-MỚI:3000`. Mở **port 3000** trong Windows Firewall
   cho mạng nội bộ (Private).

7. Cài lại Task Scheduler cho `sync\run-sync.bat` trên máy mới (xem `docs/dong-bo.md`).

### Quy tắc vàng
- **Chỉ 1 máy chạy web local + daemon tại một thời điểm.** Không để máy nhà và máy cơ
  quan cùng chạy. Chuyển hẳn, tắt máy cũ.

---

## 2. Thêm / sửa / xoá user (và cách để cả local lẫn Vercel cùng cập nhật)

### Cách 1 — Trang Quản trị (khuyến nghị)
Đăng nhập `admin` → menu **Quản trị**:
- **Thêm**: nút *+ Thêm người dùng* → điền → Lưu (mật khẩu khởi tạo `123456`).
- **Sửa**: bấm tên user → sửa họ tên / vai trò / đơn vị / SĐT / cờ "lái xe" → Lưu.
- **Xoá**: bấm **khoá** (không đăng nhập được nữa). Hệ thống **không xoá cứng** user để
  giữ lịch sử đơn. Nếu bắt buộc xoá hẳn → xem Cách 3.

Sửa ở **bản nào cũng được** (nội bộ hoặc Vercel). Daemon đồng bộ sẽ đẩy sang bên kia
sau ~20 giây. Nếu daemon đang tắt: chạy `npm run sync:once` sau khi sửa.

### Cách 2 — Nhập hàng loạt từ file Excel
Dùng khi cần thêm/sửa nhiều (điền tên thật, đổi đơn vị hàng loạt…):
1. Cập nhật `C:\Users\Admin\Downloads\Danh sách_user.xlsx`.
2. ```powershell
   npm run import:users     # -> prisma/data/users.json
   npm run db:seed          # cập nhật SQLite local (upsert theo username)
   ```
3. Cập nhật Supabase:
   ```powershell
   $env:DATABASE_URL="<chuỗi 5432>"; $env:DIRECT_URL=$env:DATABASE_URL
   npm run db:pg:seed
   npm run db:generate      # client Prisma cục bộ về lại SQLite
   ```
> `db:seed` chỉ **thêm & sửa**, không xoá. User cần bỏ → dùng "khoá" ở Cách 1.
> Không đổi mật khẩu của user đã tồn tại.

### Cách 3 — Xoá hẳn 1 user (hiếm khi cần)
Chỉ làm được nếu user **chưa từng tạo đơn nào**. Vì xoá cứng không đồng bộ, phải xoá ở
**cả 2 bên**:
```powershell
npm run db:studio                    # mở bảng users, xoá dòng — bản LOCAL
# rồi bản CLOUD:
$env:DATABASE_URL="<chuỗi 5432>"; $env:DIRECT_URL=$env:DATABASE_URL
node scripts/pg-schema.mjs
npx prisma studio --schema prisma/schema.postgres.prisma   # xoá cùng dòng
npm run db:generate
```
Khuyến nghị: **cứ khoá, đừng xoá.**

---

## 3. Đồng bộ 2 chiều bằng tay

Khi Task Scheduler không chạy, cần đồng bộ gấp, hoặc vừa sửa dữ liệu thủ công:

```powershell
npm run sync:once     # chạy đúng 1 vòng 2 chiều rồi thoát
```
- Cần `.env.sync` có `SUPABASE_DB_URL` (hoặc `$env:SUPABASE_DB_URL="..."` trước khi chạy).
- Chạy nhiều lần liên tiếp vô hại — lần sau sẽ `đẩy=0 kéo=0` nếu không có gì mới.

```powershell
npm run sync          # chạy liên tục (thay Task Scheduler), Ctrl+C để dừng
```

### Nghi ngờ 2 bên bị lệch → ép quét lại từ đầu
```powershell
npm run sync:reset    # xoá mốc đồng bộ (bảng sync_state)
npm run sync:once     # quét lại toàn bộ theo updatedAt, LWW tự hội tụ
```
An toàn: `sync_state` chỉ là "đã xử lý tới đâu", xoá đi thì lần sau quét lại hết.

### Kiểm tra tình trạng
Trang **Đồng bộ** (`/dong-bo`, đăng nhập Đội xe/admin): "Đồng bộ lần cuối", lịch sử vòng
chạy, số xung đột, watermark từng bảng.

---

## 4. Dữ liệu demo — tạo và nạp thế nào

Script: `scripts/seed-demo.mts`. Tạo ~9 đơn công tác mẫu ở **đủ trạng thái** (chờ Ban
duyệt, chờ Đội xe, đã điều xe, đang chạy, hoàn thành, bị từ chối, phát sinh) + vài
chuyến đã có số công-tơ-mét, kể cả một chuỗi **cố tình có khoảng trống** để thử cảnh báo
"km chạy ngoài đơn".

- Script tự lấy **user thật** trong CSDL: một nhân viên TT Tin Tức làm người tạo, một
  Phó/Trưởng ban TT Tin Tức làm người duyệt, `huynhvantuan` điều xe, `laixe1`/`laixe2` lái.
- Mọi đơn demo mang `createdBy = "__demo__"`. Chạy lại script sẽ **xoá hết đơn demo cũ
  rồi tạo lại**, không đụng dữ liệu thật.

### Nạp
```powershell
npm run db:seed:demo          # vào SQLite local
```
Muốn có demo trên Supabase:
```powershell
$env:DATABASE_URL="<chuỗi 5432>"; $env:DIRECT_URL=$env:DATABASE_URL; $env:ORIGIN_NODE="cloud"
npm run db:pg:seed:demo
npm run db:generate
```

### Sửa nội dung demo
Mở `scripts/seed-demo.mts`, sửa các đoạn `prisma.booking.create({...})`.

### Xoá sạch demo (giữ demo cũ đi)
`npm run db:purge` sẽ xoá **tất cả** đơn (cả demo lẫn thật). Nếu chỉ muốn bỏ demo mà
giữ đơn thật: dùng `npm run db:studio` → bảng `bookings` → lọc `createdBy = __demo__` → xoá.

---

## 5. Reset data để triển khai thật (sau thời gian chạy thử)

### Cách A — Reset sạch hoàn toàn (đơn giản, nếu chưa cấu hình nhiều)
Xoá tất cả, seed lại 366 user + 4 xe (số km = 0):
```powershell
# LOCAL
npm run db:reset            # gõ y để xác nhận; KHÔNG chạy db:seed:demo sau đó

# CLOUD
$env:DATABASE_URL="<chuỗi 5432>"; $env:DIRECT_URL=$env:DATABASE_URL; $env:ORIGIN_NODE="cloud"
npm run db:pg:reset

npm run db:generate
npm run sync:reset
npm run sync:once
```
Sau đó vào **Quản trị** cấu hình lại: tên thật, Trưởng/Phó ban, và **set số km từng xe** (mục 6).

### Cách B — Chỉ xoá đơn/chuyến, GIỮ user + xe đã cấu hình + số km
```powershell
# LOCAL
npm run db:purge

# CLOUD
$env:SUPABASE_DB_URL="<chuỗi 5432>"   # nếu chưa có trong .env.sync
npm run db:pg:purge

# đồng bộ lại từ trạng thái sạch
npm run sync:reset
npm run sync:once
```
`db:purge` xoá: `bookings`, `booking_approvals`, `booking_dispatch`, `trip_logs`,
`odometer_events`, `alert_acks`, `audit_log`, `sync_run`, `sync_conflict_log`, `sync_state`.
**Giữ nguyên**: `users`, `vehicles` (kể cả số km đã set).

> Chạy `db:purge` ở **cả 2 bên** rồi mới `sync:reset` + `sync:once`, vì xoá cứng không tự đồng bộ.

### Trước khi go-live nên
- Đổi `AUTH_SECRET` (local và Vercel, mỗi bên một chuỗi khác nhau).
- Yêu cầu mọi người đổi mật khẩu khỏi `123456` (hiện chưa bắt buộc — nếu cần, báo để bổ sung tính năng).
- Sao lưu `prisma/dev.db` ngay sau khi cấu hình xong (mốc "khai trương").

---

## 6. Set chỉ số công-tơ-mét ban đầu cho từng xe

Hiện tất cả xe = 0. Cần đặt = **số trên đồng hồ xe tại thời điểm bắt đầu dùng hệ thống thật**.

### Cách làm (admin)
**Quản trị → Xe → bấm tên xe → ô "Số km hiện tại" → nhập số thực → Lưu.**

Hoặc nhờ Tổ trưởng/Tổ phó Đội xe: **Công-tơ-mét → cột "Số km hiện tại" → ô "sửa" → Lưu.**

### Lưu ý
- Chốt số cùng lúc cho cả 4 xe, ghi lại **ngày giờ chốt** ra giấy/sổ.
- Chỉ set ở **một bên** (nội bộ hoặc Vercel), để daemon đồng bộ sang bên kia. Nếu lỡ set
  ở cả 2 bên với số khác nhau → hệ thống giữ lần nhập **sau cùng** (Last-Write-Wins).
- Sau khi set: **chuyến đầu tiên** của mỗi xe, lái xe nhập "số km lúc xuất bến" đúng bằng
  số này (form điền sẵn). Từ đó hệ thống tự nối chuỗi công-tơ-mét và bắt đầu phát hiện
  km chạy ngoài đơn.
- Việc chỉnh số km cũng được ghi vào nhật ký (`audit_log`).
