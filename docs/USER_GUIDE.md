# Hướng dẫn Sử dụng — Hệ thống Quản lý Báo cáo Công việc

---

## 1. Đăng nhập

1. Mở trình duyệt, truy cập địa chỉ hệ thống
2. Nhập **Email** và **Mật khẩu** được cấp
3. Nhấn **Đăng nhập**

> Nếu đăng nhập thất bại, kiểm tra lại email/mật khẩu hoặc liên hệ quản lý để được cấp tài khoản.

---

## 2. Tổng quan các trang

Sau khi đăng nhập, bạn sẽ thấy thanh menu bên trái với các trang:

| Trang | Ai dùng | Mô tả |
|-------|---------|-------|
| **Trang chủ** | Tất cả | Xem thống kê tháng, tiến độ, báo cáo gần đây |
| **Đội ngũ** | Quản lý | Xem chi tiết từng nhân viên |
| **Dự án** | Tất cả | Quản lý danh sách dự án |
| **Báo cáo CV** | Tất cả | Tạo, sửa, xóa báo cáo công việc hàng ngày |
| **Lịch** | Tất cả | Xem lịch tháng, biết ngày nào chưa ghi nhận |
| **Bình luận** | Quản lý | Phản hồi, góp ý về báo cáo của nhân viên |
| **Thông báo** | Tất cả | Xem nhắc nhở, đánh dấu đã đọc |
| **Báo cáo** | Tất cả | Xem báo cáo tổng hợp, xuất Excel |

---

## 3. Trang chủ

Trang chủ là nơi bạn nắm nhanh tình hình tháng này.

### Các chỉ số chính

- **Người dùng / Dự án / Báo cáo CV** — số lượng tổng trong hệ thống
- **Tháng này** — tỷ lệ phần trăm hoàn thành của bạn
- **Ngày làm việc** — tổng ngày phải làm trong tháng (trừ T7, CN, ngày lễ)
- **Ngày đã ghi** — số ngày bạn đã viết báo cáo
- **Chưa ghi (còn sửa được)** — số ngày còn trống nhưng vẫn trong thời gian cho phép
- **Tỷ lệ hoàn thành tháng** — biểu đồ trực quan
- **Theo dự án** — xem công việc phân bổ ra sao giữa các dự án
- **Báo cáo CV gần đây** — 5 báo cáo mới nhất

---

## 4. Báo cáo Công việc (Work Logs)

Đây là trang bạn dùng **hàng ngày** để ghi nhận công việc.

### 4.1 Tạo báo cáo

1. Vào trang **Báo cáo CV**
2. Nhấn nút **Tạo mới**
3. Điền thông tin:
   - **Ngày thực hiện** — mặc định là hôm nay
   - **Dự án** — chọn dự án liên quan (hoặc để trống)
   - **Nội dung công việc** — mô tả những gì bạn đã làm
4. Nhấn **Lưu**

### 4.2 Quy tắc 3 ngày

> **Quan trọng:** Sau **3 ngày làm việc**, báo cáo sẽ bị **khóa** và bạn không thể sửa/xóa được nữa.

Ví dụ:
- Báo cáo ngày **Thứ 2** → khóa sau **Thứ 5**
- Báo cáo ngày **Thứ 5** → khóa sau **Thứ 3 tuần sau** (vượt qua cuối tuần)

Trên danh sách, báo cáo sẽ hiển thị trạng thái:
- **Editable** (xanh) — còn sửa được
- **Locked** (xám) — đã khóa
- **Unlocked** (cam) — quản lý đã mở khóa

### 4.3 Sửa báo cáo

1. Tìm báo cáo cần sửa trên danh sách
2. Nhấn nút **Sửa** (chỉ hiện khi còn trong thời hạn)
3. Sửa nội dung → nhấn **Lưu**

### 4.4 Xóa báo cáo

1. Tìm báo cáo cần xóa
2. Nhấn nút **Xóa**
3. Xác nhận xóa

> Lưu ý: Chỉ xóa được khi báo cáo chưa bị khóa.

### 4.5 Đánh dấu hoàn thành

Mỗi báo cáo có 2 trạng thái:
- **In Progress** (đang làm) — màu xanh dương
- **Done** (hoàn thành) — màu xanh lá

Nhấn nút **Hoàn thành** hoặc **Mở lại** để chuyển đổi.

### 4.6 Lọc báo cáo

Sử dụng các bộ lọc phía trên bảng:
- **Lọc theo dự án** — chọn dự án từ dropdown
- **Lọc theo ngày** — chọn ngày cụ thể

---

## 5. Lịch (Calendar)

Trang lịch giúp bạn hình dung rõ nhất tháng nào đã ghi nhận, tháng nào còn thiếu.

### Cách đọc lịch

| Màu sắc | Ý nghĩa |
|---------|---------|
| Xanh lá | Đã có báo cáo công việc |
| Xanh dương nhạt | Ngày trong tuần, chưa có báo cáo |
| Đỏ nhạt | Ngày đã qua, chưa có báo cáo (cần bổ sung!) |
| Xám nhạt | Cuối tuần (T7, CN) |

### Tạo báo cáo từ lịch

Click vào ngày bất kỳ → hiện form tạo báo cáo → điền nội dung → nhấn **Tạo**.

### Thống kê phía trên

- **Ngày làm việc** — tổng ngày phải làm trong tháng
- **Đã ghi** — số ngày đã có báo cáo
- **Chưa ghi** — số ngày còn bổ sung được (trong 3 ngày)
- **Hoàn thành** — tỷ lệ %

> Quản lý có thể chọn nhân viên từ dropdown để xem lịch của nhân viên khác.

---

## 6. Thông báo

Hệ thống tự động nhắc nhở bạn khi cần.

### Các loại thông báo

| Thông báo | Khi nào nhận |
|-----------|-------------|
| **Nhắc nhở hàng ngày** | 17:30 các ngày làm việc, nếu bạn chưa ghi nhận công việc hôm nay |
| **Sắp hết hạn sửa** | Khi báo cáo sắp bị khóa (còn 1 ngày) |
| **Nhắc báo cáo tháng** | Khoảng ngày 25 hàng tháng |

### Đọc thông báo

1. Vào trang **Thông báo**
2. Danh sách hiện theo thời gian, mới nhất lên đầu
3. Thông báo chưa đọc được in đậm
4. Nhấn **Đánh dấu đã đọc** hoặc **Đánh dấu đã đọc tất cả**

### Cài đặt thông báo

Trong trang Thông báo, chuyển sang tab **Cài đặt**:
- Bật/tắt từng loại thông báo
- Chọn kênh nhận: **Trong app** hoặc **Email**

---

## 7. Dự án (Projects)

Trang này quản lý danh sách dự án mà bạn đang tham gia.

### Xem danh sách

- Danh sách tất cả dự án, phân trang
- Tìm kiếm theo tên ở ô tìm kiếm

### Tạo dự án (nếu được phép)

1. Nhấn **Tạo mới**
2. Nhập **Tên dự án** và **Mô tả**
3. Nhấn **Lưu**

### Sửa / Xóa

Nhấn nút tương ứng trên từng dòng. Xóa dự án chỉ dành cho Quản lý.

---

## 8. Báo cáo Tổng hợp (Reports)

Trang này cho bạn xem báo cáo tổng hợp theo tháng và xuất ra Excel.

### Xem báo cáo tháng

1. Chọn **tháng** và **năm**
2. Nếu là Quản lý, có thể lọc theo **nhân viên** hoặc **dự án**
3. Bảng báo cáo hiện chi tiết từng ngày

### Xuất Excel

1. Chọn tháng/năm
2. Nhấn nút **Xuất Excel**
3. File tự động tải về máy

File Excel bao gồm:
- Tiêu đề: tháng, năm
- Thông tin: họ tên, bộ phận
- 3 phần: Công việc chung, Hỗ trợ phòng ban khác, Kế hoạch tháng tiếp
- Ghi chú, chữ ký

---

## 9. Dành cho Quản lý (Manager)

### 9.1 Trang Đội ngũ

Trang này chỉ Quản lý mới thấy. Cho phép theo dõi tiến độ của từng nhân viên.

**Danh sách nhân viên:**
- Xem tên, email, tỷ lệ hoàn thành tháng
- Click vào nhân viên để xem chi tiết

**Drawer chi tiết (click vào nhân viên):**

| Tab | Nội dung |
|-----|----------|
| **Báo cáo CV** | Tất cả báo cáo của nhân viên, nhóm theo tuần, lọc theo dự án |
| **Dự án** | Danh sách dự án nhân viên đang tham gia |
| **Bình luận** | Tất cả bình luận, thêm bình luận mới |

**Mở khóa báo cáo:**
1. Trong tab Báo cáo CV, tìm báo cáo đã khóa
2. Nhấn nút **Mở khóa** (icon khóa)
3. Nhập lý do mở khóa
4. Nhân viên sẽ có thể sửa lại báo cáo đó

**Xuất Excel cho nhân viên:**
- Nhấn nút **Xuất Excel** phía trên drawer
- File báo cáo riêng cho nhân viên đó sẽ tự tải về

### 9.2 Bình luận

Quản lý có thể phản hồi, góp ý về báo cáo của nhân viên:

**Cách 1 — Từ trang Bình luận:**
1. Vào trang **Bình luận**
2. Nhấn **Tạo bình luận**
3. Chọn báo cáo CV cần phản hồi
4. Viết nội dung → nhấn **Thêm**

**Cách 2 — Từ trang Đội ngũ:**
1. Click vào nhân viên
2. Chuyển tab **Bình luận**
3. Nhấn **Thêm bình luận** trên báo cáo cụ thể

### 9.3 Quản lý Người dùng

**Tạo người dùng mới:**
1. Vào trang **Người dùng** (hiện ở Dashboard hoặc qua Ctrl+K)
2. Nhấn **Tạo mới**
3. Nhập email, mật khẩu, họ tên, vai trò (Employee/Manager)
4. Nhấn **Lưu**

**Vô hiệu hóa:**
- Nhấn nút trên dòng tương ứng → người dùng không đăng nhập được nữa

**Xóa người dùng:**
- Nhấn nút xóa → soft delete (dữ liệu vẫn giữ trong hệ thống)

---

## 10. Mẹo sử dụng

### Tìm kiếm nhanh

Nhấn **Ctrl+K** bất kỳ lúc nào → gõ tên trang → Enter để chuyển trang ngay.

### Chế độ Sáng/Tối

Nhấn avatar (góc phải trên) → chọn **Chế độ Sáng** hoặc **Chế độ Tối**.

### Đăng xuất

Nhấn avatar → chọn **Đăng xuất**.

### Thói quen tốt

- **Ghi nhận công việc mỗi ngày** trước 17:30 để không bị nhắc nhở
- **Kiểm tra trang Lịch** đầu tuần để xem tuần trước còn thiếu ngày nào
- **Sử dụng trạng thái Done** khi hoàn thành xong một công việc để dễ theo dõi
