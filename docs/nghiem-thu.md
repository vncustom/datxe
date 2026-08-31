# Danh sách nghiệm thu (M6)

Đánh dấu ✅ khi chạy thử trên **bản nội bộ** và **bản Vercel**. Mật khẩu mọi tài khoản: `123456`.

## 0. Chuẩn bị

- [ ] Bản nội bộ chạy: `npm run dev` → http://IP-nội-bộ:3000
- [ ] Bản cloud chạy: URL Vercel
- [ ] Daemon đồng bộ chạy: `npm run sync` (hoặc Task Scheduler) — trang `/dong-bo` báo "Bình thường"
- [ ] Đã làm sạch dữ liệu user cơ bản trong `/quan-tri` (tên thật cho các user còn trùng username; đủ Trưởng/Phó ban mỗi đơn vị)

## 1. Đăng nhập & phân quyền

- [ ] `laixe1` đăng nhập → thấy menu **Lịch xe, Chuyến của tôi, Đơn của tôi**, không thấy Duyệt/Điều xe/Quản trị
- [ ] `machithong` (Phó ban TT Tin Tức) → thấy thêm **Duyệt đơn**
- [ ] `huynhvantuan` (Tổ trưởng Đội xe) → thấy **Điều xe, Công-tơ-mét, Thống kê, Đồng bộ**
- [ ] `admin` → thấy **Quản trị**
- [ ] Sai mật khẩu → báo lỗi, không vào được
- [ ] User bị "khoá" trong Quản trị → không đăng nhập được

## 2. Vòng đời một đơn công tác

- [ ] Nhân viên TT Tin Tức bấm ô giờ trên lịch → điền mẫu đơn → Gửi → trạng thái **Chờ Ban duyệt** (xám)
- [ ] Phó/Trưởng ban TT Tin Tức mở `/duyet` → thấy đơn → **Duyệt** → trạng thái **Chờ Đội xe** (cam)
- [ ] Tổ trưởng/Tổ phó Đội xe mở `/dieu-xe` → chọn **xe** + **lái xe** + ghi chú → **Điều xe** → trạng thái **Đã điều xe** (xanh lá)
- [ ] Lịch hiển thị đúng màu theo từng bước
- [ ] Chuông + badge sidebar cập nhật đúng số việc chờ xử lý cho từng vai trò
- [ ] Ban **Từ chối** → trạng thái đỏ, kèm lý do; Đội xe **Từ chối** → đỏ

## 3. Hủy đơn

- [ ] Người tạo hủy đơn khi đang **Chờ Ban duyệt** → OK
- [ ] Người tạo KHÔNG hủy được sau khi Ban đã duyệt
- [ ] Sau khi **Đã điều xe**, chỉ Trưởng/Phó Ban **Văn Phòng Đài** hủy được

## 4. Đơn phát sinh

- [ ] Lái xe tạo đơn phát sinh ("đổ xăng") → vào thẳng **Chờ Đội xe**, có nhãn "Phát sinh"
- [ ] Đội xe điều xe cho đơn phát sinh như bình thường

## 5. Công-tơ-mét

- [ ] Lái xe mở **Chuyến của tôi** → chuyến **Đã điều xe** → nhập **số km lúc xuất bến** (điền sẵn = số km xe) + giờ → **Bắt đầu chuyến** → trạng thái **Đang chạy** (xanh dương)
- [ ] Banner vàng "có chuyến chưa đóng" hiện ở mọi trang cho tới khi đóng chuyến
- [ ] Nhập **số km lúc về** + giờ kết thúc → **Kết thúc & đóng chuyến** → trạng thái **Hoàn thành**; số km xe cập nhật
- [ ] Nhập km về < km đi → bị chặn, báo lỗi
- [ ] Không cho bắt đầu chuyến mới trên xe đang có chuyến chưa đóng
- [ ] `/dieu-xe` đầu trang liệt kê xe đang chạy chưa đóng, đánh dấu "QUÁ GIỜ" nếu quá giờ dự kiến
- [ ] `/cong-to-met`: tạo cố tình 1 khoảng trống (odo đầu chuyến sau > odo cuối chuyến trước + 1 km) → hiện cảnh báo đỏ; bấm **Biết rồi** → ẩn; `?daxem=1` → xem lại được

## 6. Thống kê (Tổ trưởng)

- [ ] `/thong-ke` chọn Tháng này / Tháng trước / khoảng ngày → số liệu đổi theo
- [ ] Bảng theo lái xe: số chuyến, phát sinh, tổng km, giờ chạy, **km chưa giải trình** đúng
- [ ] Bảng theo xe: km theo chuyến vs km theo công-tơ-mét, chênh lệch
- [ ] Bấm tên lái xe → trang chi tiết từng chuyến
- [ ] **CSV lái xe / CSV xe** tải về, mở bằng Excel đúng
- [ ] **In / Lưu PDF** ra trang sạch (ẩn menu)

## 7. Đồng bộ 2 chiều

- [ ] Tạo đơn trên **Vercel** → sau ~20 giây thấy trên **bản nội bộ** (mã `HTV-C-…`)
- [ ] Tạo đơn trên **bản nội bộ** → thấy trên **Vercel** (mã `HTV-L-…`)
- [ ] Duyệt/điều xe/nhập km ở bên này → bên kia cập nhật
- [ ] Sửa **cùng một đơn** ở cả 2 bên trong vòng 20 giây → LWW: bên sửa sau thắng; `/dong-bo` ghi 1 xung đột
- [ ] Hủy (xoá mềm) một đơn → đơn biến mất ở cả 2 bên
- [ ] Ngắt mạng máy nội bộ vài phút → `/dong-bo` báo lỗi "cloud unreachable"; nối lại → tự đồng bộ tiếp
- [ ] Trang `/dong-bo` hiển thị "Đồng bộ lần cuối", lịch sử vòng chạy, watermark từng bảng

## 8. Quản trị

- [ ] `/quan-tri`: sửa họ tên 1 user → số "trùng username" giảm
- [ ] Thêm 1 user mới → đăng nhập được bằng mật khẩu `123456`
- [ ] Bổ sung Trưởng/Phó ban cho đơn vị còn thiếu → thẻ cảnh báo giảm
- [ ] `reset MK` → user đó đăng nhập lại bằng `123456`
- [ ] `/quan-tri/xe`: sửa số km 1 xe / thêm xe mới → xuất hiện trong danh sách điều xe
- [ ] User / xe mới tạo ở bản nội bộ → sau đồng bộ có trên Vercel (cùng id)

## 9. Điện thoại (lái xe)

- [ ] Mở URL Vercel trên điện thoại → giao diện co gọn, nút to
- [ ] "Thêm vào màn hình chính" → mở ra chạy như app
- [ ] Lái xe nhập công-tơ-mét trên điện thoại thuận tiện

---

## Ghi chú vận hành khi chạy song song

- Trước khi có đủ tin tưởng, chọn **1 bản làm chính** để nhập các thay đổi lớn (thêm/sửa user, xe).
- Sao lưu `prisma/dev.db` mỗi ngày (copy kèm ngày giờ).
- Bật **Set time automatically** trên máy nội bộ (đồng bộ LWW dựa vào đồng hồ).
- Sau khi chạy bất kỳ lệnh `db:pg:*`, client Prisma cục bộ chuyển sang Postgres →
  chạy `npm run db:generate` (hoặc `npm run dev` — đã tự chạy) để trở lại SQLite.
