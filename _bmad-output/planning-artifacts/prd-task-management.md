# Tài liệu Yêu cầu Sản phẩm (PRD)
## Quản lý Công việc — Task Management

**Dự án:** nestjs-project-example
**Tác giả:** John (PM Agent)
**Ngày:** 2026-05-09
**Trạng thái:** Bản nháp
**Phiên bản:** 2.0

---

## 1. Tổng quan

### 1.1 Tuyên bố Vấn đề

Nhân viên hiện không có công cụ có cấu trúc để ghi nhận kết quả làm việc hàng ngày. Quản lý không có tầm nhìn rõ ràng về những gì đã hoàn thành across các dự án. Báo cáo cuối tháng được làm thủ công, dễ sai sót, và tốn thời gian. Không có kênh giao tiếp nhẹ giữa quản lý và nhân viên để phản hồi về công việc.

### 1.2 Tầm nhìn Sản phẩm

Một module Quản lý Công việc đơn giản, tập trung — nơi nhân viên ghi nhận công việc hàng ngày theo từng nhiệm vụ dự án, quản lý có tầm nhìn theo thời gian thực và có thể phản hồi theo ngữ cảnh, báo cáo tháng được tạo chỉ bằng một cú click — bao gồm xuất Excel.

### 1.3 Nguyên tắc Cốt lõi

1. **Ghi nhận hàng ngày không ma sát → báo cáo tháng tức thì → vòng phản hồi tự nhiên.** Không theo dõi giờ làm. Chỉ tập trung vào kết quả.
2. **Thiết kế ưu tiên adoption:** Không có quy trình duyệt/từ chối. Nếu ghi nhận cảm giác như bị giám sát, nhân viên sẽ không làm nhất quán — và giá trị hệ thống phụ thuộc hoàn toàn vào chất lượng dữ liệu. Phản hồi mang tính tư vấn, không mang tính hành chính kiểm soát.
3. **Toàn vẹn dữ liệu là hồ sơ hiệu suất:** WorkLog đóng vai trò là hồ sơ chống sửa đổi, có giới hạn thời gian của đóng góp cá nhân. Khả năng thay đổi có giới hạn thời gian (khóa 3 ngày) nhằm bảo toàn tính toàn vẹn này.

---

## 2. Đối tượng Sử dụng

### 2.1 Nhân viên (Employee)

- Tạo WorkLog hàng ngày báo cáo những gì đã hoàn thành
- Thuộc một hoặc nhiều Dự án với các Nhiệm vụ được giao
- Tạo và xuất báo cáo tháng
- Nhận phản hồi từ quản lý trên các mục công việc
- **Cửa sổ chỉnh sửa WorkLog: 3 ngày làm việc kể từ executionDate** — không tính cuối tuần và ngày lễ. Sau đó, mục nhập bị khóa vĩnh viễn. Ví dụ: log cho thứ Sáu có thể sửa từ thứ Hai đến thứ Tư, khóa vào thứ Năm. Chỉ quản lý mới có quyền override (mở khóa).

### 2.2 Quản lý (Manager)

- **Mô hình tổ chức phẳng** — quản lý có thể xem dữ liệu TẤT CẢ nhân viên (không giới hạn theo phân cấp)
- Xem tổng hợp công việc toàn cảnh và chi tiết theo nhân viên, dự án, và tháng
- Nhận xét trên từng WorkLog hoặc báo cáo tổng hợp để hướng dẫn và coaching
- KHÔNG duyệt hay từ chối — phản hồi mang tính tư vấn, không mang tính hành chính. Đây là chiến lược adoption có chủ đích: quy trình duyệt hành chính khiến nhân viên ngại ghi nhận nhất quán

### 2.3 Admin

- Quản lý tài khoản người dùng (tạo, vô hiệu hóa)
- Phân vai (Nhân viên / Quản lý)
- Không có UI riêng trong v1 — khởi tạo qua CLI hoặc migration

---

## 3. Luồng Người dùng (User Journeys)

### 3.1 UJ-01: Nhân viên Ghi nhận Công việc Hàng ngày

**Vai trò:** Nhân viên
**Kích hoạt:** Cuối ngày làm việc (hoặc trong cửa sổ lookback 3 ngày)
**Mục tiêu:** Ghi lại những gì đã làm trong ngày, gắn với một Dự án cụ thể

```
1. Nhân viên xác thực qua email + mật khẩu → nhận JWT
2. Hệ thống tự động chọn Dự án gần nhất (smart default)
3. Nhân viên gõ nội dung công việc vào ô duy nhất → nhấn Enter
4. Hệ thống tạo WorkLog:
   - projectId = dự án đã chọn
   - executionDate = hôm nay
   - content = nội dung tự do
5. Hệ thống xác thực:
   - executionDate không phải ngày tương lai
   - executionDate không quá 3 ngày làm việc trong quá khứ
6. Hệ thống lưu WorkLog
7. Hoàn thành trong < 15 giây
```

**Luồng thay thế:**
- **2a.** Nhân viên muốn đổi dự án → tìm kiếm hoặc tạo mới (UJ-06)
- **3a.** Nhân viên sửa WorkLog hiện có → chỉ `content` được sửa, trong cửa sổ 3 ngày
- **3b.** Nhân viên xóa WorkLog → soft delete, chỉ trong cửa sổ 3 ngày
- **4a.** `executionDate` vượt quá lookback → hệ thống trả về 422

---

### 3.2 UJ-02: Nhân viên Tạo Báo cáo Tháng

**Vai trò:** Nhân viên
**Kích hoạt:** Cuối tháng, hoặc cần xem lại tổng hợp công việc cá nhân
**Mục tiêu:** Xem toàn bộ công việc đã làm trong tháng, sắp xếp theo thời gian

```
1. Nhân viên chuyển đến Báo cáo Tháng
2. Hệ thống hiện bộ chọn tháng/năm (mặc định = tháng hiện tại)
3. Nhân viên chọn tháng và năm
4. Hệ thống truy vấn tất cả WorkLog của nhân viên trong kỳ đã chọn
5. Hệ thống hiển thị bảng báo cáo:
   | Ngày | Dự án | Nội dung công việc | Nhận xét của sếp |
6. Các dòng được sắp xếp theo thời gian (tăng dần theo executionDate)
7. Cột "Nhận xét của sếp" hiện nhận xét của quản lý nếu có, ô trống nếu không
```

**Luồng thay thế:**
- **4a.** Không tìm thấy WorkLog trong kỳ → hiển thị trạng thái "không có dữ liệu"
- **5a.** Nhân viên lọc theo Dự án → chỉ hiện WorkLog của dự án đó

---

### 3.3 UJ-03: Nhân viên Xuất Báo cáo Excel

**Vai trò:** Nhân viên
**Kích hoạt:** Cần nộp hoặc lưu trữ báo cáo công việc tháng
**Mục tiêu:** Tải file .xlsx của báo cáo tháng

```
1. Nhân viên đang xem Báo cáo Tháng (UJ-02) với các bộ lọc mong muốn
2. Nhân viên nhấn "Xuất Excel"
3. Hệ thống tạo file .xlsx với cùng dữ liệu và cột hiển thị trong báo cáo
4. Hệ thống trả về file tải về với tên: BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx
```

**Luồng thay thế:**
- **3a.** Không có dữ liệu trong kỳ → hệ thống trả về Excel trống chỉ có header
- **3b.** Xuất mất >5 giây → hệ thống ghi log cảnh báo hiệu năng

---

### 3.4 UJ-04: Quản lý Xem lại Công việc Nhân viên

**Vai trò:** Quản lý
**Kích hoạt:** Kiểm tra định kỳ hoặc xem lại cuối tháng
**Mục tiêu:** Xem tất cả nhân viên đang làm gì

```
1. Quản lý xác thực qua email + mật khẩu → nhận JWT
2. Quản lý chuyển đến Báo cáo Tháng
3. Hệ thống hiện bộ chọn tháng/năm (mặc định = tháng hiện tại)
4. Quản lý chọn tháng và năm
5. Quản lý có thể lọc theo Nhân viên hoặc Dự án
6. Hệ thống hiển thị bảng báo cáo (cùng cấu trúc UJ-02) cho phạm vi đã chọn
7. Quản lý xem lại các mục
```

**Luồng thay thế:**
- **5a.** Quản lý chọn Nhân viên cụ thể → chỉ hiện WorkLog của nhân viên đó
- **5b.** Quản lý chọn Dự án cụ thể → hiện WorkLog tất cả nhân viên cho dự án đó
- **5c.** Không áp dụng bộ lọc → hiện WorkLog tất cả nhân viên trong tháng

---

### 3.5 UJ-05: Quản lý Nhận xét trên WorkLog

**Vai trò:** Quản lý
**Kích hoạt:** Đang xem báo cáo tháng của nhân viên và muốn phản hồi
**Mục tiêu:** Để lại phản hồi theo ngữ cảnh trên một WorkLog cụ thể

```
1. Quản lý đang xem Báo cáo Tháng (UJ-04) hoặc chi tiết một WorkLog
2. Quản lý chọn một WorkLog để nhận xét
3. Quản lý viết nhận xét (văn bản tự do)
4. Hệ thống lưu nhận xét liên kết với WorkLog, quản lý là tác giả
5. Nhận xét hiển thị cho nhân viên trong lần xem báo cáo tiếp theo
```

**Luồng thay thế:**
- **2a.** Quản lý sửa nhận xét đã viết → cập nhật nội dung
- **2b.** Quản lý xóa nhận xét của mình → xóa khỏi báo cáo và Excel

---

### 3.6 UJ-06: Quản lý Dự án (Tạo / Merge)

**Vai trò:** Bất kỳ người dùng nào (tạo) / Quản lý (merge)
**Kích hoạt:** Cần tạo dự án mới hoặc gộp dự án trùng lặp
**Mục tiêu:** Duy trì danh sách dự án sạch cho toàn công ty

```
1. Người dùng tạo Dự án (tên) — tự do, không cần quản lý duyệt
2. Mọi người dùng thấy dự án mới trong danh sách tìm kiếm
3. Quản lý phát hiện trùng lặp → chọn "Gộp dự án"
4. Hệ thống chuyển toàn bộ WorkLog từ dự án nguồn sang đích
5. Dự án nguồn bị archive
```

**Luồng thay thế:**
- **2a.** Tên dự án đã tồn tại → hệ thống gợi ý chọn thay vì tạo mới
- **3a.** Quản lý không có quyền merge → trả về 403

---

### 3.7 UJ-07: Xác thực Người dùng

**Vai trò:** Nhân viên hoặc Quản lý
**Kích hoạt:** Mở ứng dụng lần đầu, hoặc token hết hạn
**Mục tiêu:** Xác thực và nhận quyền truy cập tính năng phù hợp với vai trò

```
1. Người dùng gửi email + mật khẩu đến /auth/login
2. Hệ thống xác thực thông tin đăng nhập với bcrypt hash đã lưu
3. Thành công: hệ thống trả về { accessToken (TTL 15 phút), refreshToken (TTL 7 ngày) }
4. Client gửi accessToken trong header Authorization cho mọi request tiếp theo
5. Khi accessToken hết hạn, client gọi /auth/refresh với refreshToken
6. Hệ thống trả về accessToken mới
```

**Luồng thay thế:**
- **2a.** Thông tin không hợp lệ → trả về 401 Unauthorized
- **2b.** Tài khoản bị vô hiệu hóa (isActive = false) → trả về 403 Forbidden
- **5a.** refreshToken hết hạn → người dùng phải xác thực lại (quay lại bước 1)

---

### 3.8 UJ-08: Quản lý Mở khóa WorkLog (Override)

**Vai trò:** Quản lý
**Kích hoạt:** Nhân viên cần sửa WorkLog đã quá hạn 3 ngày (ốm đau, khẩn cấp...)
**Mục tiêu:** Override khóa 3 ngày để cho phép nhân viên chỉnh sửa

```
1. Quản lý xem báo cáo và phát hiện WorkLog cần sửa đã bị khóa
2. Quản lý nhấn "Mở khóa" trên WorkLog đó
3. Hệ thống yêu cầu quản lý nhập lý do mở khóa (reason) — bắt buộc
4. Hệ thống ghi nhận override với: unlockedBy (ID quản lý), unlockedAt (thời gian), reason (lý do)
5. Nhân viên nhận thông báo WorkLog đã được mở khóa
6. Nhân viên chỉnh sửa WorkLog (chỉ actualResult)
7. Sau khi nhân viên lưu, WorkLog tự động khóa lại
```

**Luồng thay thế:**
- **2a.** Quản lý không có quyền → trả về 403 (chỉ manager role mới override được)

---

## 4. Mô hình Domain

### 4.1 Quan hệ Entity

```
User (1) ──┬──< (M) Task (người được gán)
            │
            └──< (M) WorkLog (nhân viên)
                    └──< (M) Comment (bởi Quản lý)

Project (1) ──< (M) Task (1) ──< (M) WorkLog
```

```
Project (1) ──< (M) Task (1) ──< (M) WorkLog (1) ──< (M) Comment
                  │                            │
                  │ được gán cho Nhân viên     │ được tạo bởi Nhân viên
                  │                            │
                  └──────── thuộc về ──────────┘
```

### 4.2 Các Entity

#### User (Người dùng)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Định danh duy nhất |
| email | string | Email đăng nhập (duy nhất) |
| password | string | Mật khẩu đã hash (bcrypt) |
| fullName | string | Tên hiển thị |
| role | enum | `employee`, `manager` |
| isActive | boolean | Trạng thái tài khoản |
| createdAt | datetime | Thời gian tạo |
| updatedAt | datetime | Thời gian cập nhật |

#### Project (Dự án)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Định danh duy nhất |
| name | string | Tên dự án |
| description | string | Mô tả dự án (tùy chọn) |
| status | enum | `active`, `completed`, `archived` |
| createdAt | datetime | Thời gian tạo |
| updatedAt | datetime | Thời gian cập nhật |

#### WorkLog (Nhật ký công việc)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Định danh duy nhất |
| projectId | UUID | Tham chiếu dự án |
| employeeId | UUID | Nhân viên tạo log này |
| executionDate | date | Ngày thực hiện công việc |
| content | text | Nội dung công việc / kết quả chi tiết (tự do) |
| isUnlocked | boolean | Trạng thái mở khóa override |
| unlockedBy | UUID | ID quản lý mở khóa (null nếu chưa override) |
| unlockedAt | datetime | Thời gian mở khóa (null nếu chưa override) |
| unlockReason | text | Lý do mở khóa — bắt buộc khi override (C-6) |
| createdAt | datetime | Thời gian tạo |
| updatedAt | datetime | Thời gian cập nhật |

#### Comment (Nhận xét)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Định danh duy nhất |
| workLogId | UUID | Tham chiếu WorkLog đích |
| authorId | UUID | Người viết nhận xét (Quản lý) |
| content | text | Nội dung phản hồi / nhận xét |
| createdAt | datetime | Thời gian tạo |

---

### 4.5 Ràng buộc Nghiệp vụ

Các quy tắc sau là bất biến — không thể bỏ qua hoặc nới lỏng:

| Mã | Ràng buộc | Chi tiết |
|----|-----------|----------|
| C-1 | **Quy tắc khóa 3 ngày làm việc** | WorkLog chỉ có thể tạo/sửa/xóa trong vòng 3 ngày làm việc từ `executionDate`. Không tính cuối tuần và ngày lễ. Sau khi hết hạn, WorkLog bị khóa vĩnh viễn. Chỉ quản lý mới có quyền override (mở khóa để sửa). |
| C-2 | **Không ghi ngày tương lai** | `executionDate` không được là ngày trong tương lai. Chỉ ghi nhận công việc đã thực hiện. |
| C-3 | **Một WorkLog/Nhiệm vụ/Ngày** | Mỗi nhân viên chỉ tạo tối đa 1 WorkLog cho mỗi Nhiệm vụ trong cùng `executionDate`. Ngăn trùng lặp. |
| C-5 | **Tìm kiếm trước khi tạo** | Để giảm thiểu rác dữ liệu, luồng UI bắt buộc nhân viên phải gõ tìm kiếm tên Project/Task; tính năng "Tạo mới" chỉ xuất hiện khi kết quả tìm kiếm trống。 |
| C-6 | **Lưu vết Mở khóa (Audit Trail)** | Khi WorkLog đã quá hạn 3 ngày, chỉ Quản lý mới có quyền mở khóa (Override). Hành động này bắt buộc phải lưu lại các trường: `unlockedBy` (ID của quản lý), `unlockedAt` (thời gian), và `reason` (lý do mở khóa). Đảm bảo tính minh bạch và truy vết mọi ngoại lệ. |
| C-7 | **Phân quyền Hiển thị (Visibility)** | Nhân viên chỉ có quyền xem, sửa, xóa WorkLog của chính mình. Nhân viên không được xem WorkLog của người khác trong cùng dự án (để tránh so bì hoặc copy kết quả). Quản lý có quyền xem toàn bộ. |

---

## 5. Yêu cầu Chức năng

### 5.1 FR-01: Quản lý WorkLog (Nhân viên)

**Mức ưu tiên:** P0 — Bắt buộc

- Nhân viên có thể tạo WorkLog cho bất kỳ Dự án nào
- Mỗi WorkLog ghi nhận:
  - `executionDate` — ngày thực hiện công việc
  - `content` — nội dung công việc tự do (nhật ký hành động)
- Nhân viên có thể xem, sửa, và xóa WorkLog của mình
- **Quy tắc khóa 3 ngày làm việc:** WorkLog trở thành không thể thay đổi sau 3 ngày làm việc từ `executionDate`. Không tính cuối tuần và ngày lễ. Ví dụ: log thứ Sáu sửa được từ thứ Hai đến thứ Tư, khóa vào thứ Năm. Chỉ quản lý mới có thể override mở khóa.
- Cửa sổ 3 ngày áp dụng cho cả tạo mới và chỉnh sửa — nhân viên có thể tạo log với `executionDate` tối đa 3 ngày làm việc trong quá khứ
- WorkLog được nhóm theo Nhiệm vụ và hiển thị theo thời gian
- WorkLog được nhóm theo Dự án và hiển thị theo thời gian

**Tiêu chí Chấp nhận:**
- [ ] Nhân viên tạo được WorkLog với executionDate và content cho Dự án
- [ ] Nhân viên sửa được content của WorkLog mình (trong cửa sổ 3 ngày)
- [ ] Nhân viên xóa được WorkLog của mình (trong cửa sổ 3 ngày)
- [ ] Hệ thống trả về 403/422 khi cố sửa/xóa WorkLog đã quá cửa sổ khóa 3 ngày
- [ ] Quản lý override được khóa 3 ngày và mở khóa WorkLog để nhân viên sửa
- [ ] Hệ thống lưu vết mở khóa: unlockedBy, unlockedAt, reason (C-6)
- [ ] Hệ thống trả về 422 khi tạo WorkLog với executionDate quá 3 ngày làm việc
- [ ] Hệ thống từ chối tạo WorkLog quá 3 ngày làm việc từ executionDate
- [ ] Nhân viên chỉ xem/sửa/xóa được WorkLog của chính mình, không xem được của người khác (C-7)
- [ ] Quản lý xem được WorkLog của tất cả nhân viên (C-7)
- [ ] WorkLog hiển thị nhóm theo Nhiệm vụ, sắp xếp giảm dần theo executionDate

### 5.2 FR-02: Xem Báo cáo Tháng (Nhân viên & Quản lý)

**Mức ưu tiên:** P0 — Bắt buộc

- Người dùng có thể xem tổng hợp WorkLog theo tháng
- Báo cáo trình bày dạng bảng theo thời gian:
  - **Ngày** → **Dự án** → **Nhiệm vụ** → **Chi tiết công việc** → **Nhận xét** (nếu có)
- Nhân viên chỉ thấy dữ liệu của mình
- Quản lý thấy dữ liệu tất cả nhân viên trong phạm vi
- Báo cáo có thể lọc theo:
  - Bộ chọn Tháng/Năm
  - Nhân viên (chỉ quản lý)
  - Dự án

**Tiêu chí Chấp nhận:**
- [ ] Báo cáo tháng hiển thị WorkLog dạng bảng theo thời gian với đủ 5 cột
- [ ] Nhân viên chỉ thấy WorkLog của mình trong báo cáo
- [ ] Quản lý xem được báo cáo của bất kỳ nhân viên
- [ ] Bộ chọn Tháng/Năm lọc kỳ báo cáo
- [ ] Quản lý lọc được theo nhân viên và dự án
- [ ] Báo cáo trống hiển thị trạng thái "không có dữ liệu" rõ ràng

### 5.3 FR-03: Xuất Excel

**Mức ưu tiên:** P0 — Bắt buộc

- Xuất báo cáo tháng ra Excel (.xlsx) chỉ bằng một click
- File Excel phản ánh đúng cấu trúc bảng báo cáo:
  | STT | Tên SP/Dự án | Tuần | Kế hoạch | Thực hiện | % Kết quả | Ý kiến đề xuất | Ghi chú |
- Định dạng tên file: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`
- Xuất áp dụng cùng bộ lọc đang hoạt động trên báo cáo
- **Dữ liệu di động:** File xuất có thể chia sẻ cho bên ngoài (HR, compliance, khách hàng) không có quyền hệ thống — file phải tự chứa và đọc được không cần ứng dụng
- **Lưu ý về tin cậy dữ liệu:** File xuất là bản chụp tại thời điểm tải và không mang гарантии xác thực. Nếu cần xuất đã chứng nhận/chống sửa đổi, đây là tính năng nâng cao sau này

**Tiêu chí Chấp nhận:**
- [ ] Nhấn "Xuất" tạo và tải file .xlsx
- [ ] Cột Excel khớp: Ngày, Tên Dự án, Tên Nhiệm vụ, Chi tiết công việc hoàn thành, Nhận xét của sếp
- [ ] File đặt tên `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`
- [ ] Ô trống cho "Nhận xét của sếp" khi không có nhận xét
- [ ] Bộ lọc đang hoạt động (dự án, tháng) được phản ánh trong dữ liệu xuất

### 5.4 FR-04: Nhận xét / Phản hồi của Quản lý

**Mức ưu tiên:** P0 — Bắt buộc

- Quản lý có thể để lại nhận xét trên bất kỳ WorkLog nào
- Nhận xét là trường văn bản tự do do quản lý viết
- Nhận xét hiển thị cho nhân viên sở hữu WorkLog
- Quản lý có thể sửa hoặc xóa nhận xét của mình
- Nhận xét xuất hiện trong báo cáo tháng và Excel ở cột "Nhận xét của sếp"

**Tiêu chí Chấp nhận:**
- [ ] Quản lý tạo được nhận xét trên bất kỳ WorkLog
- [ ] Nhận xét hiển thị cho nhân viên trong báo cáo của họ
- [ ] Quản lý sửa được nội dung nhận xét của mình
- [ ] Quản lý xóa được nhận xét của mình
- [ ] Nhận xét xuất hiện trong cột "Nhận xét của sếp" ở báo cáo và Excel

### 5.5 FR-05: Quản lý Dự án & Merge

**Mức ưu tiên:** P1 — Nên có

- CRUD cho Dự án — cả nhân viên và quản lý đều có thể tạo
- Tìm kiếm Project trước khi tạo — chỉ hiện nút "Tạo mới" khi kết quả tìm kiếm trống (C-5)
- Mọi Project được tạo hiển thị chung cho toàn công ty
- **Merge Project** — quản lý gộp dự án trùng lặp, chuyển WorkLog sang dự án đích

**Tiêu chí Chấp nhận:**
- [ ] Tạo, đọc, cập nhật, archive Dự án (cả nhân viên và quản lý)
- [ ] API tìm kiếm Project với fuzzy matching
- [ ] Quản lý merge được 2+ dự án trùng tên — toàn bộ WorkLog chuyển sang đích
- [ ] Dự án nguồn bị archive sau merge, không bị xóa vĩnh viễn

### 5.6 FR-06: Xác thực & Phân quyền

**Mức ưu tiên:** P0 — Bắt buộc (nền tảng — mọi tính năng khác phụ thuộc vào đây)

- Xác thực JWT: người dùng đăng nhập bằng email + mật khẩu, nhận access token + refresh token
- Hai vai trò: `employee` và `manager`
- Role-based guards ở cấp controller
- Mô hình phân quyền phẳng: quản lý truy cập dữ liệu tất cả nhân viên (không giới hạn theo nhóm/dự án)
- Khởi tạo người dùng qua lệnh CLI hoặc database migration

**Tiêu chí Chấp nhận:**
- [ ] POST `/auth/login` trả về JWT access token + refresh token cho thông tin hợp lệ
- [ ] POST `/auth/refresh` trả về access token mới sử dụng refresh token hợp lệ
- [ ] Mọi endpoint bảo vệ trả về 401 khi không có JWT hợp lệ
- [ ] Endpoint dành cho nhân viên trả về 403 khi truy cập bởi vai trò `manager` trên thao tác ghi
- [ ] Endpoint dành cho quản lý (nhận xét, xem tất cả báo cáo) trả về 403 cho vai trò `employee`
- [ ] Mật khẩu lưu dưới dạng bcrypt hash (không bao giờ plaintext)
- [ ] Lệnh CLI hoặc migration để khởi tạo admin/manager ban đầu

### 5.7 FR-07: Hệ thống Thông báo

**Mức ưu tiên:** P0 — Bắt buộc (quan trọng cho adoption — không có nhắc nhở chủ động, tỷ lệ ghi nhận hàng ngày giảm đáng kể)

Hệ thống thông báo thúc đẩy các hành vi người dùng cốt lõi đã định nghĩa trong Product Brief (HB-1 đến HB-7). Gồm hai loại:

**A) Thông báo Lịch (Cron-based):**

| Mã | Kích hoạt | Người nhận | Kênh | Nội dung |
|----|-----------|------------|------|----------|
| N-1 | 5:30 PM, nhân viên chưa có WorkLog hôm nay | Nhân viên | In-app + Email | "Bạn chưa ghi nhận công việc hôm nay. Chỉ mất 2 phút!" |
| N-2 | Còn 1 ngày làm việc trước khi hết hạn khóa 3 ngày | Nhân viên | In-app | "WorkLog ngày {date} sắp bị khóa. Kiểm tra và chỉnh sửa ngay." |
| N-3 | 5:00 PM thứ Sáu hàng tuần | Nhân viên | Email | Tổng kết tuần: số ngày đã ghi / tổng ngày làm việc, nhận xét mới, ngày còn trống |
| N-4 | Nhân viên không có WorkLog trong 2 ngày làm việc liên tiếp | Quản lý | In-app | "{employee} chưa ghi nhận công việc 2 ngày qua. Có thể cần hỗ trợ?" |
| N-5 | Ngày làm việc đầu tiên của tháng mới | Quản lý | In-app + Email | "Báo cáo tháng {MM} đã sẵn sàng. Xem và nhận xét ngay." |
| N-6 | Dự án đã tạo nhưng chưa có Nhiệm vụ được gán sau 2 ngày | Quản lý | In-app | "Dự án {name} chưa có task nào. Thêm task và gán nhân viên." |

**B) Thông báo Sự kiện (Event-Triggered):**

| Mã | Sự kiện | Người nhận | Kênh | Nội dung |
|----|---------|------------|------|----------|
| N-7 | Quản lý nhận xét trên WorkLog | Nhân viên (chủ WorkLog) | In-app + Email | "{manager} đã nhận xét về công việc ngày {date} của bạn" |
| N-8 | Nhiệm vụ được gán cho nhân viên | Nhân viên | In-app + Email | "Bạn được gán task mới: {title} trong dự án {project}" |

**Nguyên tắc Thiết kế Thông báo:**
- **Chống spam:** Mỗi loại thông báo tối đa 1 lần/ngày/người dùng
- **Có thể cấu hình:** Người dùng chọn chỉ in-app, email, hoặc tắt từng loại
- **Liên kết hành động:** Mỗi thông báo chứa link/nút dẫn thẳng đến hành động cần làm
- **Nhận thức ngày làm việc:** Thông báo lịch tuân thủ lịch ngày làm việc (không nhắc cuối tuần/ngày lễ)

**Tiêu chí Chấp nhận:**
- [ ] N-1 kích hoạt đúng giờ khi nhân viên chưa có WorkLog cho ngày hiện tại (chỉ ngày làm việc)
- [ ] N-2 kích hoạt khi cửa sổ khóa 3 ngày của WorkLog còn 1 ngày làm việc
- [ ] N-3 gửi email tổng kết tuần mỗi thứ Sáu đúng giờ
- [ ] N-4 kích hoạt khi nhân viên có 0 WorkLog trong 2 ngày làm việc liên tiếp
- [ ] N-5 kích hoạt vào ngày làm việc đầu tiên của mỗi tháng
- [ ] N-6 kích hoạt khi Dự án có 0 Nhiệm vụ được gán sau 2 ngày lịch
- [ ] N-7 kích hoạt ngay khi Comment được tạo trên WorkLog
- [ ] N-8 kích hoạt ngay khi Task được gán cho Nhân viên
- [ ] Người dùng cấu hình được tùy chọn thông báo (in-app / email / tắt) cho từng loại
- [ ] Mỗi thông báo chứa link hành động trực tiếp đến màn hình tương ứng

### 5.8 FR-08: Calendar View & Summary View

**Mức ưu tiên:** P1 — Nên có (hỗ trợ hành vi Tự rà soát HB-4)

**Calendar View (Xem theo Lịch):**
- Hiển thị WorkLog trên layout lịch (theo tháng)
- Ngày có WorkLog được đánh dấu (màu xanh/đậm)
- Ngày không có WorkLog được highlight (thu hút sự chú ý vào khoảng trống)
- Ngày đã quá cửa sổ khóa 3 ngày khác biệt trực quan với ngày còn sửa được
- Click vào ngày mở tạo WorkLog (nếu trong cửa sổ 3 ngày) hoặc hiện mục hiện có
- Chỉ ngày làm việc tương tác được — cuối tuần/ngày lễ hiển thị nhưng không click ghi log

**Summary View (Xem Tổng hợp):**
- Hiển thị tổng hợp hoạt động công việc cho kỳ đã chọn (tuần hoặc tháng)
- Hiển thị: tổng ngày đã ghi, tổng ngày làm việc, tỷ lệ hoàn thành, dự án/nhiệm vụ đã làm
- Highlight ngày trống còn trong cửa sổ chỉnh sửa 3 ngày

**Tiêu chí Chấp nhận:**
- [ ] Calendar View render lịch tháng với chỉ báo WorkLog trên ngày đã ghi
- [ ] Ngày làm việc trống trong cửa sổ 3 ngày khác biệt trực quan với ngày trống đã khóa
- [ ] Click ngày còn sửa được chuyển đến tạo WorkLog cho ngày đó
- [ ] Summary View hiện tổng ngày đã ghi / tổng ngày làm việc cho kỳ đã chọn
- [ ] Summary View highlight ngày trống còn sửa được để hành động nhanh

---

## 6. Yêu cầu Phi chức năng

### 6.1 Kiến trúc

- **Backend:** NestJS với cấu trúc module Domain-Driven Design (DDD)
- **Pattern:** CQRS — tách biệt đường dẫn Command và Query
  - **Commands:** Tạo/cập nhật/xóa WorkLog, Tạo/cập nhật/xóa Comment
  - **Queries:** Tạo báo cáo tháng, Tổng hợp WorkLog theo Nhiệm vụ/Dự án, Xuất Excel
- **Cơ sở dữ liệu:** Quan hệ (PostgreSQL được khuyến nghị)

### 6.2 Hiệu năng

- Báo cáo tháng với tối đa 500 WorkLog phải render dưới 2 giây
- Xuất Excel cho dữ liệu tháng của một nhân viên phải hoàn thành dưới 5 giây
- Thời gian phản hồi API cho thao tác CRUD WorkLog dưới 500ms

### 6.3 Toàn vẹn Dữ liệu

- `executionDate` không được là ngày tương lai
- `executionDate` không quá 3 ngày làm việc trong quá khứ (buộc ghi nhận kịp thời, không tính cuối tuần và ngày lễ)
- Một nhân viên tạo tối đa một WorkLog cho mỗi Nhiệm vụ mỗi `executionDate` (ngăn trùng lặp)
- Soft delete cho WorkLog để bảo toàn audit trail
- Tính không thể thay đổi của WorkLog được thực thi ở cấp domain — chính entity WorkLog xác thực cửa sổ 3 ngày trước khi cho phép thay đổi

### 6.4 Bảo mật

- JWT access token có TTL ngắn (15 phút) + refresh token (7 ngày)
- Hash mật khẩu bằng bcrypt (salt rounds >= 10)
- Kiểm soát truy cập theo vai trò: `employee` vs `manager`
- Mô hình tổ chức phẳng: quản lý thấy TẤT CẢ nhân viên (không cần lọc theo nhóm)
- Nhân viên chỉ truy cập được WorkLog của mình
- Endpoint API thực thi phân quyền qua NestJS guards ở cấp controller
- Giới hạn tốc độ trên endpoint xác thực (login, refresh) để ngăn brute force

---

## 7. Bề mặt API (Cấp cao)

### Xác thực (Public)

| Phương thức | Endpoint | Mô tả |
|-------------|----------|-------|
| POST | `/auth/login` | Đăng nhập bằng email + mật khẩu, trả về JWT tokens |
| POST | `/auth/refresh` | Làm mới access token |

### Commands (Ghi)

| Phương thức | Endpoint | Mô tả |
|-------------|----------|-------|
| POST | `/work-logs` | Tạo WorkLog |
| PUT | `/work-logs/:id` | Cập nhật WorkLog |
| DELETE | `/work-logs/:id` | Xóa WorkLog |
| POST | `/work-logs/:id/unlock` | Quản lý override khóa 3 ngày — bắt buộc gửi `reason` (C-6) |
| POST | `/work-logs/:id/comments` | Quản lý thêm nhận xét |
| PUT | `/comments/:id` | Quản lý sửa nhận xét |
| DELETE | `/comments/:id` | Quản lý xóa nhận xét |
| POST | `/projects` | Tạo dự án — cả nhân viên và quản lý (C-4) |
| PUT | `/projects/:id` | Cập nhật dự án |
| POST | `/projects/:id/tasks` | Tạo nhiệm vụ — cả nhân viên và quản lý (C-4) |
| GET | `/projects/search?q=` | Tìm kiếm dự án (fuzzy) — dùng trước khi tạo mới (C-5) |

### Queries (Đọc)

| Phương thức | Endpoint | Mô tả |
|-------------|----------|-------|
| GET | `/reports/monthly?month={MM}&year={YYYY}&employeeId={id}&projectId={id}` | Lấy dữ liệu báo cáo tháng |
| GET | `/reports/monthly/export?month={MM}&year={YYYY}&employeeId={id}&projectId={id}` | Xuất báo cáo tháng ra Excel |
| GET | `/projects` | Danh sách dự án |
| GET | `/projects/:id` | Chi tiết dự án |

| GET | `/work-logs?taskId={id}&executionDate={date}` | Danh sách work log |
| GET | `/work-logs/calendar?month={MM}&year={YYYY}` | Calendar view — chỉ báo WorkLog theo ngày cho nhân viên đã đăng nhập |
| GET | `/work-logs/summary?month={MM}&year={YYYY}` | Summary view — thống kê công việc tổng hợp theo kỳ |

### Thông báo

| Phương thức | Endpoint | Mô tả |
|-------------|----------|-------|
| GET | `/notifications` | Danh sách thông báo của người dùng hiện tại (phân trang) |
| PUT | `/notifications/:id/read` | Đánh dấu đã đọc |
| PUT | `/notifications/read-all` | Đánh dấu tất cả đã đọc |
| GET | `/notifications/preferences` | Lấy tùy chọn thông báo của người dùng |
| PUT | `/notifications/preferences` | Cập nhật tùy chọn (in-app/email/tắt theo loại) |

---

## 8. Cấu trúc Module DDD Đề xuất

```
src/
├── modules/
│   ├── auth/               # Module Xác thực
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   └── login.command.ts
│   │   │   └── queries/
│   │   ├── infrastructure/
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── jwt-refresh.strategy.ts
│   │   │   └── bcrypt.service.ts
│   │   └── presentation/
│   │       ├── auth.controller.ts
│   │       └── dto/
│   ├── user/               # User aggregate (định danh)
│   │   ├── domain/
│   │   │   ├── user.entity.ts
│   │   │   └── user-role.enum.ts
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── project/           # Project aggregate (Dự án)
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   └── queries/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── task/              # Task aggregate (Nhiệm vụ)
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   └── queries/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── work-log/          # WorkLog aggregate (core — Nhật ký công việc)
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── create-work-log.command.ts
│   │   │   │   ├── update-work-log.command.ts
│   │   │   │   └── delete-work-log.command.ts
│   │   │   └── queries/
│   │   │       ├── get-work-logs.query.ts
│   │   │       └── get-monthly-report.query.ts
│   │   ├── infrastructure/
│   │   │   └── excel-export.service.ts
│   │   └── presentation/
│   │       └── work-log.controller.ts
│   ├── comment/           # Comment entity (thuộc ngữ cảnh WorkLog)
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   └── queries/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── notification/      # Hệ thống Thông báo
│       ├── application/
│       │   ├── commands/
│       │   │   └── send-notification.command.ts
│       │   └── queries/
│       │       └── get-notifications.query.ts
│       ├── infrastructure/
│       │   ├── email.service.ts
│       │   ├── notification.scheduler.ts    # @Cron scheduled jobs
│       │   └── notification.repository.ts
│       └── presentation/
│           ├── notification.controller.ts
│           └── dto/
├── shared/                # Shared kernel
│   ├── domain/
│   └── infrastructure/
```

---

## 9. Ngoài phạm vi v1

Các mục sau **không** nằm trong phiên bản đầu tiên:

- Theo dõi giờ làm (time tracking)
- Quy trình duyệt/từ chối Nhiệm vụ
- Ứng dụng mobile
- Hỗ trợ multi-tenant / đa tổ chức
- Collaboration thời gian thực (WebSockets)
- Đính kèm tệp tin trên WorkLog
- Dashboard phân tích / biểu đồ

---

## 10. Chỉ số Thành công

### Giai đoạn Ra mắt (Tháng đầu tiên)

| Chỉ số | Mục tiêu |
|--------|----------|
| Onboard người dùng | 10 người dùng đầu tiên onboard thành công |
| Báo cáo tháng đầu tiên | Ít nhất 1 báo cáo tháng xuất Excel thành công |
| Ổn định hệ thống | Không có sự cố mất dữ liệu hoặc hỏng dữ liệu |

### Giai đoạn Duy trì (Sau 3 tháng)

| Chỉ số | Mục tiêu | Cách đo lường |
|--------|----------|---------------|
| Tỷ lệ ghi nhận hàng ngày | >80% nhân viên tích cực ghi nhận ít nhất 4 ngày/tuần | Truy vấn DB tự động hàng tuần |
| Tốc độ tạo báo cáo tháng | <3 giây từ lúc click đến khi tải xong | Monitoring thời gian phản hồi |
| Tương tác quản lý | >60% báo cáo tháng nhận được ít nhất 1 nhận xét | Truy vấn DB tự động hàng tháng |
| Báo cáo trống | <5% nhân viên có báo cáo tháng trống | Truy vấn DB tự động hàng tháng |
| Hiệu quả thông báo | >50% WorkLog được tạo sau khi nhận nhắc nhở cuối ngày | Theo dõi notification → creation events |

---

## 11. Quyết định Đã chốt

| # | Câu hỏi | Quyết định | Lý do |
|---|---------|------------|-------|
| 1 | Hệ thống xác thực/định danh | **Xây từ đầu** — JWT + bcrypt | Dự án chưa có auth. Cần entity User với vai trò `employee`/`manager`. |
| 2 | Quan hệ Quản lý-Nhân viên | **Mô hình phẳng** — quản lý thấy TẤT CẢ | Đơn giản trước tiên. Không cần giới hạn phân cấp. Bất kỳ quản lý nào cũng xem được dữ liệu bất kỳ nhân viên nào. |
| 3 | Khả năng sửa WorkLog sau khi hết hạn | **Cửa sổ khóa 3 ngày làm việc** | Buộc kỷ luật — nhân viên phải ghi nhận trong 3 ngày làm việc từ `executionDate`. Không tính cuối tuần và ngày lễ. Sau đó, mục nhập không thể thay đổi trừ khi quản lý override. |
| 4 | Kỳ lookback cho tạo WorkLog | **Tối đa 3 ngày làm việc** | Cùng quy tắc 3 ngày làm việc áp dụng cho tạo mới. Không thể tạo WorkLog với `executionDate` quá 3 ngày làm việc. |
| 5 | Công nghệ Frontend | **Chỉ Backend API (v1)** | Tập trung xây dựng NestJS API vững chắc. Frontend sẽ được giải quyết ở giai đoạn sau. |
| 6 | Hệ thống thông báo trong v1 | **Đưa vào v1** | Ban đầu dự định cho v2, nhưng phân tích rủi ro adoption cho thấy nhắc nhở hàng ngày quan trọng để đạt tỷ lệ ghi nhận >80%. Không có thông báo chủ động, nhân viên quên ghi nhận. |
| 7 | Calendar View & Summary View | **Đưa vào v1 (P1)** | Hỗ trợ hành vi Tự rà soát (HB-4). Nhân viên cần cách trực quan để nhận diện ngày trống khi còn sửa được, ngăn bất ngờ cuối tháng. |
| 8 | Quản lý override WorkLog đã khóa | **Có, quản lý có thể mở khóa** | Tính không thể thay đổi tuyệt đối tạo vấn đề vận hành (ốm đau, khẩn cấp). Override của quản lý cung cấp van an toàn trong khi vẫn giữ nguyên ý định toàn vẹn của quy tắc 3 ngày. |
| 9 | Ngày làm việc vs ngày lịch cho quy tắc khóa | **Ngày làm việc** | Tính cuối tuần/ngày lễ vào cửa sổ ghi nhận là bất công cho nhân viên. 3 ngày làm việc tạo đối xử nhất quán bất kể công việc làm vào ngày nào. |

## 12. Câu hỏi Mở

| # | Câu hỏi | Mức quan trọng | Tác động |
|---|---------|----------------|----------|
| 1 | Đã phỏng vấn nhân viên/quản lý mục tiêu nào để xác thực vấn đề chưa? | Cao | Không có xác thực, có thể đang giải quyết vấn đề giả định. Khuyến nghị 5-8 phỏng vấn ngữ cảnh trước khi chốt phạm vi. |
| 2 | Quy mô tổ chức mục tiêu cho pilot v1 là bao nhiêu? | Cao | Quyết định độ phức tạp UX và khối lượng dữ liệu. Khuyến nghị bắt đầu với 1 đội ngũ 10-15 người. |
| 3 | Dữ liệu dự án/nhiệm vụ hiện có trong Excel/Sheets có cần migration vào hệ thống không? | Trung bình | Ảnh hưởng trải nghiệm ngày đầu. Bắt đầu trống có thể làm giảm adoption; migration cần công cụ import. |
| 4 | Quy trình nào tiêu thụ file Excel xuất ra? (payroll, khách hàng, nội bộ?) | Trung bình | Format xuất trở thành chuẩn de facto — khó thay đổi khi đã sử dụng. Cần thiết kế cho đúng đối tượng. |
| 5 | Kênh gửi thông báo nào ngoài in-app + email? Tích hợp Zalo? | Trung bình | Zalo là kênh giao tiếp doanh nghiệp phổ biến nhất tại Việt Nam. Có thể quan trọng cho adoption. |
| 6 | Định nghĩa lịch ngày làm việc cho quy tắc khóa 3 ngày thế nào? | Cao | Cần định nghĩa ngày lễ Việt Nam, ngày nghỉ riêng công ty. Hardcode hay cấu hình? Ảnh hưởng mọi tính toán ngày. |

---

*Tài liệu được tạo bởi John (PM Agent) — BMAD Method v6.6.0 — v2.0 cập nhật đồng bộ với Product Brief & Distillate, dịch sang tiếng Việt*
