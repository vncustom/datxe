# Triển khai bản cloud (Vercel + Supabase)

Bản cloud dùng **PostgreSQL/Supabase**, cùng một codebase với bản local (SQLite).
`scripts/prisma-generate.mjs` tự chọn lược đồ theo `DATABASE_URL`:
`postgres://…` → `prisma/schema.postgres.prisma` (tự sinh), còn lại → `prisma/schema.prisma`.

> Trước M5, bản cloud và bản local là **2 CSDL độc lập, chưa đồng bộ**.
> Nên chọn 1 bản làm nơi nhập liệu chính cho tới khi có Sync Engine.

---

## Ai kết nối với ai

- **GitHub** giữ mã nguồn. **Vercel** theo dõi GitHub, build & chạy app, kết nối tới
  Postgres của Supabase bằng chuỗi kết nối đặt trong biến môi trường của Vercel.
- **Supabase** chỉ là cơ sở dữ liệu Postgres — **không cần biết** GitHub hay Vercel.
- **Máy local** chạy `db:pg:push` (tạo bảng) + `db:pg:seed` (nạp user) một lần, và
  sau này chạy daemon đồng bộ (M5).

## 1. Tạo dự án Supabase

Ở màn hình **Create a new project**:

| Mục | Chọn gì |
|---|---|
| **Organization** | tổ chức Free của bạn (LHpe) |
| **GitHub (optional)** | **Bỏ qua, không bấm Connect.** Đây là tính năng để Supabase tự chạy migration dạng `supabase/migrations/*.sql` khi push GitHub — mình không dùng (mình đẩy schema bằng Prisma từ máy local). |
| **Project name** | `datxe` (hoặc tuỳ ý) |
| **Database password** | Bấm **Generate a password**, **lưu lại ngay** (đây là `PASS` trong chuỗi kết nối; có thể reset sau nhưng phiền). |
| **Region** | **Asia-Pacific → Singapore** (gần Việt Nam nhất). |
| **Enable Data API** | **Bỏ chọn** — mình nối thẳng Postgres qua Prisma, không dùng REST API tự sinh. (Để bật cũng không sao.) |
| **Automatically expose new tables** | **Bỏ chọn.** |
| **Enable automatic RLS** | **Bỏ chọn** — app tự kiểm soát quyền ở tầng đăng nhập; bật RLS mà chưa có policy sẽ chặn hết truy vấn. |

Bấm **Create new project**, đợi ~2 phút.

## 2. Lấy chuỗi kết nối

Trên dashboard bấm nút **Connect** (góc trên) → mục **Connection string**. Lấy 2 chuỗi,
thay `[YOUR-PASSWORD]` bằng mật khẩu đã lưu:

- **Transaction pooler** — host `…pooler.supabase.com`, cổng **`6543`** → `DATABASE_URL`.
  Thêm đuôi `?pgbouncer=true&connection_limit=1`.
- **Session pooler** — cùng host pooler, cổng **`5432`** → `DIRECT_URL` (dùng cho `db push` / `seed`).

> ⚠ **Dùng host pooler cho cả hai** (`aws-0-…pooler.supabase.com`). Đừng dùng chuỗi
> "Direct connection" `db.xxxxx.supabase.co:5432` — host này chỉ có IPv6, nhiều mạng ở
> Việt Nam và Vercel không gọi được, sẽ báo lỗi kết nối.

Ví dụ:
```
DATABASE_URL = postgresql://postgres.abcdefgh:MẬT_KHẨU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL   = postgresql://postgres.abcdefgh:MẬT_KHẨU@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## 3. Đẩy lược đồ + dữ liệu lên Supabase (chạy trên máy local)

Chạy **1 lần** khi khởi tạo, và **mỗi khi đổi `schema.prisma`**. Dùng chuỗi cổng `5432`.

**Bash / macOS / Linux:**
```bash
npm run import:users        # tạo prisma/data/users.json từ file Excel

DATABASE_URL="<chuỗi 5432>" DIRECT_URL="<chuỗi 5432>" npm run db:pg:push
DATABASE_URL="<chuỗi 5432>" DIRECT_URL="<chuỗi 5432>" ORIGIN_NODE=cloud npm run db:pg:seed
```

**Windows PowerShell:**
```powershell
npm run import:users

$env:DATABASE_URL="<chuỗi 5432>"; $env:DIRECT_URL="<chuỗi 5432>"
npm run db:pg:push
$env:ORIGIN_NODE="cloud"; npm run db:pg:seed
```

`db:pg:seed` tạo 366 user (mật khẩu `123456`) + 4 xe. Không tạo dữ liệu demo.
Muốn dữ liệu mẫu: `... tsx scripts/seed-demo.mts` với cùng biến môi trường.

## 4. Đưa mã nguồn lên GitHub

```bash
git add -A && git commit -m "cau hinh trien khai cloud"
git branch -M main
git remote add origin git@github.com:<tài-khoản>/datxe.git
git push -u origin main
```
(`.env`, `prisma/dev.db`, `prisma/data/users.json`, `prisma/schema.postgres.prisma` đã nằm trong `.gitignore`.)

## 5. Tạo dự án Vercel

1. vercel.com → **Add New → Project** → import repo `datxe` (Vercel sẽ xin quyền
   truy cập GitHub — đây mới là chỗ cần kết nối GitHub, không phải ở Supabase).
2. Framework: **Next.js** (tự nhận). **Build command / Output**: để mặc định
   (`npm run build` đã tự chọn lược đồ Postgres nhờ `DATABASE_URL`).
3. **Environment Variables** (Production + Preview):

   | Tên | Giá trị |
   |---|---|
   | `DATABASE_URL` | chuỗi pooler cổng **6543** + `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | chuỗi cổng **5432** |
   | `AUTH_SECRET` | chuỗi ngẫu nhiên dài (vd `openssl rand -hex 32`) |
   | `ORIGIN_NODE` | `cloud` |
   | `APP_TZ` | `Asia/Ho_Chi_Minh` |

4. **Deploy**.

## 6. Kiểm tra

- Mở URL Vercel → đăng nhập `laixe1` / `123456`.
- Tạo một đơn: mã phải bắt đầu bằng `HTV-C-` (bản local là `HTV-L-`).

## Lưu ý vận hành

- **Đổi schema về sau**: sửa `prisma/schema.prisma` → chạy lại `db:pg:push` (cổng 5432),
  rồi redeploy Vercel. Bản local chạy `npm run db:migrate` như thường.
- **Bảo mật**: `AUTH_SECRET` bản cloud và bản local nên **khác nhau**. Không đưa
  connection string / service key vào repo.
- **Supabase free tier** tạm dừng sau ~7 ngày không truy vấn; lần gọi đầu sẽ chậm vài giây.
- **Lái xe cài như app**: mở URL trên điện thoại → trình duyệt → "Thêm vào màn hình chính"
  (đã có `manifest.webmanifest`, chạy chế độ standalone).
