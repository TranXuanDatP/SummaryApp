---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
lastStep: 14
status: complete
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief-task-management.md"
  - "_bmad-output/planning-artifacts/prd-task-management.md"
  - "_bmad-output/planning-artifacts/architecture-task-management.md"
---

# Đặc tả Thiết kế UX — nestjs-project-example

**Tác giả:** Pc
**Ngày:** 2026-05-11

---

## Tổng quan

### Tầm nhìn Dự án

Module Quản lý Công việc tích hợp vào nền tảng NestJS DDD/CQRS hiện có, thay thế luồng làm việc bằng Google Sheets + Zalo mà các doanh nghiệp vừa và nhỏ Việt Nam đang sử dụng. Module biến 2-3 ngày tổng hợp báo cáo thủ công thành 3 giây xuất Excel. v1 chỉ là backend API — không có frontend UI.

### Đối tượng Sử dụng

| Người dùng | Hành vi | Động lực |
|------------|---------|----------|
| **Nhân viên** | Ghi nhận công việc mỗi ngày trong <15 giây | Xây dựng hồ sơ năng lực — không chỉ báo cáo sếp |
| **Quản lý** | Xem lại & nhận xét bất đồng bộ | Kênh phản hồi ít áp lực (phù hợp văn hóa công sở Việt Nam) |
| **Admin** | Quản lý người dùng qua CLI/migration | Không có UI trong v1 |

### Thách thức Thiết kế Chính

1. **Thiết kế response cho luồng <15 giây** — API phải hỗ trợ mẫu "một trường + Enter" (tự động chọn dự án, tối thiểu trường bắt buộc)
2. **Rõ ràng trong lỗi nghiệp vụ** — khóa 3 ngày, không ghi ngày tương lai, một log mỗi dự án mỗi ngày — lỗi phải cụ thể và có hướng dẫn xử lý
3. **Mẫu UX phù hợp văn hóa** — văn hóa công sở Việt Nam: phản hồi bằng văn bản (không nói chuyện trực tiếp), quản lý truy cập không phân cấp, kỳ vọng thông báo kiểu Zalo
4. **Thiết kế thông báo** — 8 loại với trigger, kênh, và tần suất khác nhau — không spam nhưng phải thúc đẩy sử dụng
5. **Ranh giới hiển thị dữ liệu** — nhân viên chỉ xem được của mình (C-7) vs quản lý xem tất cả — phải nhất quán trên mọi endpoint

### Cơ hội Thiết kế

1. **API smart defaults** — tự động chọn dự án gần nhất, executionDate = hôm nay, client chỉ cần gửi `content`
2. **Mẫu search-before-create** — endpoint tìm kiếm fuzzy hướng dẫn client tránh trùng lặp dữ liệu
3. **Thiết kế Calendar & Summary API** — response có cấu trúc để frontend tương lai render trực tiếp (chỉ báo trạng thái, cờ cửa sổ chỉnh sửa)
4. **Hệ thống tùy chọn thông báo** — cấu hình kênh theo từng loại cho người dùng kiểm soát, giảm tỷ lệ bỏ dùng

## Trải nghiệm Người dùng Cốt lõi

### Định nghĩa Trải nghiệm

Hành động cốt lõi là ghi nhận công việc hàng ngày của Nhân viên — mở hệ thống, dự án tự chọn, gõ nội dung, nhấn Enter, xong trong <15 giây. Mọi thứ khác xoay quanh thói quen này. Nếu ghi nhận không mượt mà, không có dữ liệu chảy và hệ thống sụp đổ. v1 chỉ có REST API, nên UX nằm trong API contract: cấu trúc response, thông báo lỗi, giá trị mặc định, và các trường được tính sẵn.

### Chiến lược Nền tảng

Backend REST API (NestJS) cho v1. Không frontend, không mobile. API phải được thiết kế để frontend tương lai có thể triển khai luồng <15 giây mà không cần phức tạp. Các yếu tố nền tảng chính:
- JSON request/response cho mọi thao tác CRUD
- Tải file (.xlsx) cho xuất Excel
- Endpoint danh sách phân trang cho báo cáo và thông báo
- JWT auth với role-based guards

### Các Tương tác Không ma sát

1. **Tạo WorkLog** — chỉ cần gửi `content` (projectId tự chọn, executionDate mặc định = hôm nay)
2. **Tìm kiếm dự án trước khi tạo** — tìm kiếm fuzzy trả kết quả ngay; tạo mới chỉ hiện khi kết quả trống
3. **Lọc báo cáo tháng** — một endpoint duy nhất với query params kết nối trực tiếp đến bộ lọc
4. **Xuất Excel** — một GET request với cùng bộ lọc, trả về file .xlsx

### Khoảnh khắc Thành công Quan trọng

1. **WorkLog đầu tiên** — phải hoàn thành trong <15 giây với ít trường nhất
2. **Xuất Excel đầu tiên** — phải tạo đúng file trong <5 giây
3. **Nhận xét quản lý đầu tiên** — thông báo phải liên kết trực tiếp đến WorkLog
4. **Hiển thị khóa 3 ngày** — response phải có cờ cửa sổ chỉnh sửa

### Nguyên tắc Trải nghiệm

1. **Ghi nhận không ma sát** — API chỉ nhận dữ liệu tối thiểu; giá trị mặc định xử lý phần còn lại
2. **Lỗi là hướng dẫn** — mọi error response kèm thông báo cụ thể, có thể hành động
3. **Tiết lộ dần dần** — endpoint cơ bản trả dữ liệu cần thiết; chi tiết là query riêng biệt
4. **Phù hợp văn hóa** — phản hồi bất đồng bộ, truy cập phẳng, response tiếng Việt khi phù hợp

## Phản hồi Cảm xúc Mong muốn

### Mục tiêu Cảm xúc Chính

- **Nhân viên:** Sự tự tin — "Công việc của tôi được ghi nhận, tôi có bằng chứng đóng góp." Hệ thống là công cụ xây hồ sơ cá nhân, không phải công cụ giám sát.
- **Quản lý:** Sự làm chủ — "Tôi nhìn thấy tiến độ mà không cần đốc thúc." Nhận xét bất đồng bộ thay thế các buổi phản hồi trực tiếp khó chịu.

### Ánh xạ Hành trình Cảm xúc

| Giai đoạn | Nhân viên | Quản lý |
|-----------|-----------|---------|
| Đăng nhập lần đầu | Tò mò + hoài nghi nhẹ | Hoài nghi — "lại một công cụ?" |
| Tạo WorkLog đầu tiên | **Nhẹ nhõm** — "nhanh thật" | — |
| Hình thành thói quen | **Phản xạ** — không cần suy nghĩ | **Làm chủ** — thấy hoạt động đội ngũ |
| Nhận được nhận xét | **Được hỗ trợ** — coaching, không phán xét | **Hiệu quả** — phản hồi đã gửi |
| Xuất Excel đầu tiên | **Tự hào** — công việc của tôi, tổng hợp sẵn | **Nhẹ nhõm** — 3 giây thay vì 3 ngày |
| Gặp lỗi | **Rõ ràng** — lỗi nói rõ phải làm gì | **Rõ ràng** — tương tự |

### Vi cảm xúc

- **Tự tin vs. Bối rối** — luồng tạo rõ ràng, xác nhận ngay lập tức
- **Tin tưởng vs. Hoài nghi** — cờ cửa sổ chỉnh sửa trong mọi response, không có khóa bí ẩn
- **Thành tựu vs. Bực bội** — 201 + full DTO khi thành công
- **Thuộc về vs. Cô lập** — thông báo nhận xét mang tên quản lý, cá nhân hóa

### Cảm xúc Cần Tránh

1. **Bị giám sát** — nhân viên không bao giờ cảm thấy bị theo dõi
2. **Bị phạt** — lỗi khóa đọc như hướng dẫn, không phải khiển trách. Ví dụ: "WorkLog ngày này không thể chỉnh sửa nữa. Liên hệ quản lý nếu cần thay đổi."
3. **Spam quá tải** — tối đa 1 thông báo/loại/người dùng/ngày, tùy chọn do người dùng kiểm soát
4. **Lo âu dữ liệu** — xác nhận ngay loại bỏ nghi ngờ "đã lưu chưa?"

### Hệ quả Thiết kế

| Cảm xúc | Thiết kế API |
|---------|-------------|
| Tự tin | Trả về full DTO sau create/update — nhân viên thấy chính xác những gì đã lưu |
| Tin tưởng | Bao gồm `isEditable`, `editWindowClosesAt` trong response |
| Rõ ràng | Lỗi bao gồm các trường `code`, `message`, và `suggestion` |
| Hỗ trợ | Thông báo nhận xét mang `managerName` và `workLogDate` — cá nhân, không máy móc |
| Thành tựu | Response 201 + Location header + full resource |
| Làm chủ | Calendar API trả về `hasWorkLog`, `isEditable` cho từng ngày — khoảng trống hiển thị rõ |

## Phân tích Mẫu UX & Cảm hứng

### Phân tích Sản phẩm Tham chiếu

| Sản phẩm | Điểm tốt | Bài học |
|----------|----------|---------|
| Google Sheets | Đơn giản, bảng quen thuộc | API response đơn giản như bảng |
| Zalo | Thông báo đẩy, cảm giác "sống" | Notification API có actionLink dẫn thẳng đến hành động |
| Notion | Khối nội dung tự do | WorkLog content là text tự do, không ép schema |
| Linear | Keyboard-first, luồng nhanh | Smart defaults giảm trường client phải gửi |
| Todoist | Nhắc nhở thông minh, không phiền | Notification cap + user preferences |

### Mẫu UX Áp dụng được

1. **Single-entry flow** (Todoist) — chỉ cần 1 text field + Enter, API chỉ bắt buộc `content`
2. **Flat list + filter** (Google Sheets) — không menu phức tạp, chỉ lọc tháng/dự án/nhân viên
3. **Search-before-create** (Google suggest) — gõ → gợi ý → chọn hoặc tạo mới
4. **Inline feedback** (Zalo comment) — nhận xét gắn trực tiếp trên WorkLog
5. **Calendar indicator** (Google Calendar) — ngày có dữ liệu đánh dấu, ngày trống highlight

### Anti-Pattern cần Tránh

1. **Over-engineering** — không approval workflow, không status phức tạp
2. **Quá nhiều trường bắt buộc** — WorkLog chỉ cần `content`
3. **Silent failures** — mọi vi phạm nghiệp vụ phải có error cụ thể
4. **Notification spam** — người dùng sẽ tắt hết nếu quá nhiều

### Chiến lược Cảm hứng

| Hành động | Mẫu | Lý do |
|-----------|-----|-------|
| Áp dụng | Single-entry flow (Todoist) | Hỗ trợ luồng <15 giây |
| Áp dụng | Notification preferences (Todoist) | Người dùng kiểm soát, giảm bỏ dùng |
| Áp dụng | Flat list + filter (Sheets) | Quen thuộc, không cần học |
| Điều chỉnh | Search-before-create (Google) | Áp dụng cho Project, fuzzy matching |
| Điều chỉnh | Calendar view (Google Calendar) | Thêm cờ isEditable cho cửa sổ 3 ngày |
| Tránh | Approval workflow (Jira) | Xung đột mục tiêu adoption |
| Tránh | Multi-field forms | Tạo ma sát, phá vỡ thói quen |

## Nền tảng Hệ thống Thiết kế

### Lựa chọn Hệ thống Thiết kế

Mở rộng API Style Guide dựa trên pattern DDD/CQRS hiện có của dự án. v1 là backend API only nên không cần UI design system. Thay vào đó, cần bộ quy tắc nhất quán cho API contract: response format, error format, pagination, và business rule flags.

### Lý do Lựa chọn

1. Dự án đã có pattern vững từ Product/Order module — chỉ cần bổ sung, không thay thế
2. Module mới có tính năng chưa có precedent: Excel export, Calendar view, Notification scheduling, 3-day lock
3. Error response cần chuẩn hóa vì nhiều nghiệp vụ phức tạp (C-1 đến C-7)

### Cách tiếp cận Triển khai

| Khía cạnh | Pattern | Ghi chú |
|-----------|---------|---------|
| Response thành công | Full DTO + `version` | Optimistic locking |
| Response lỗi | `{ code, message, suggestion, details? }` | Hướng dẫn hành động |
| Phân trang | `?page=1&limit=20` + metadata | `total, page, totalPages` |
| File download | Binary + `Content-Disposition` | Excel export |
| Auth | `Authorization: Bearer <token>` | Trừ login/refresh |
| ID format | UUID string (50 chars) | Tương thích Drizzle schema |

### Chiến lược Tùy biến

| Tùy biến | Chi tiết |
|----------|----------|
| Error code namespace | `WORKLOG_*`, `PROJECT_*`, `AUTH_*`, `NOTIFICATION_*` |
| Business rule flags | `isEditable`, `editWindowClosesAt` trong WorkLog response |
| Calendar response | Mảng ngày với status flags — pattern mới |
| Notification preferences | Nested object `{ type, channel, enabled }` |

## Trải nghiệm Tương tác Cốt lõi

### Trải nghiệm Định nghĩa

"Gõ nội dung công việc, nhấn Enter, xong." — trải nghiệm định nghĩa sản phẩm. Nếu API hỗ trợ luồng <15 giây này mượt mà, mọi thứ khác theo sau. Dữ liệu từ hành động này nuôi sống báo cáo, nhận xét, và thông báo.

### Mô hình Tâm lý Người dùng

| Hiện trạng | Kỳ vọng |
|-----------|----------|
| Mở Sheets → tìm dòng → gõ → format → gửi Zalo | Mở app → gõ → Enter. Xong |
| Ghi chép tạm, quên, sót ngày | Mỗi ngày 15 giây, cuối tháng 3 giây |
| Sợ format sai, sợ sót | Hệ thống nhắc, tự nhóm, xuất sẵn |

### Tiêu chí Thành công

1. **"Nó cứ hoạt động"** — `POST /work-logs` chỉ cần `{ content }`, trả 201 + full DTO
2. **Cảm giác thông minh** — Response chứa `projectName`, `isEditable`, `editWindowClosesAt`
3. **Xác nhận tức thì** — Không cần GET lại, response 201 đủ mọi thông tin
4. **Lỗi hướng dẫn** — `{ code, message, suggestion }` cho mọi vi phạm nghiệp vụ

### Đánh giá Mẫu

| Mẫu | Loại | Ghi chú |
|-----|------|---------|
| Single-field create | Đã thiết lập | Áp dụng trực tiếp (Todoist) |
| 3-day lock flags | Mới | Cần `isEditable` + `editWindowClosesAt` trong response |
| Smart default project | Mới | Endpoint trả suggestedProjectId |
| Calendar view | Đã thiết lập | Mảng ngày + status flags |
| Notification preferences | Đã thiết lập | Nested object theo loại (Todoist) |

### Cơ chế Trải nghiệm

**Khởi tạo:** Client gọi defaults endpoint → nhận suggestedProjectId + todayDate
**Tương tác:** Gõ content → đổi dự án nếu cần (search) → Enter → POST /work-logs
**Phản hồi:** 201 + full DTO với isEditable, editWindowClosesAt — hoặc 422 + code + message + suggestion
**Hoàn thành:** Xác nhận tức thì, không cần hành động tiếp. Notification nhắc ngày mai.

## Nền tảng Thiết kế Response API

### Hệ thống Phân loại Response

| Loại | Status | Ngữ nghĩa |
|------|--------|-----------|
| Tạo thành công | 201 Created | Xác nhận tích cực |
| Đọc thành công | 200 OK | Thông tin neutral |
| Cập nhật thành công | 200 OK | Xác nhận thay đổi |
| Lỗi nghiệp vụ | 422 Unprocessable | Cảnh báo, cần hành động |
| Lỗi phân quyền | 403 Forbidden | Cấm |
| Lỗi xác thực | 401 Unauthorized | Cần đăng nhập lại |
| Không tìm thấy | 404 Not Found | Không tồn tại |

### Naming Convention

| Khía cạnh | Quy tắc | Ví dụ |
|-----------|---------|-------|
| Endpoint path | kebab-case, số nhiều | `/work-logs` |
| JSON field | camelCase | `executionDate` |
| Error code | UPPER_SNAKE + prefix | `WORKLOG_LOCKED` |
| Enum value | lowercase string | `"employee"` |
| Query param | camelCase | `?employeeId=abc` |

### Cấu trúc Response

Thứ tự trường nhất quán: **Identity → Relationships → Content → Status flags → Metadata**

### Tiêu chuẩn Khả năng Sử dụng API

| Khía cạnh | Quy tắc |
|-----------|---------|
| Consistency | Cùng field cùng tên mọi endpoint |
| Completeness | Response đủ dữ liệu, không cần gọi thêm |
| Discoverability | Error chứa suggestion |
| Pagination | Luôn trả total, page, totalPages |
| Null handling | Trả null, không bỏ trường |
| Date format | ISO 8601 UTC |

## Quyết định Hướng Thiết kế API

### Các Hướng đã Khảo sát

1. **Tối giản** — ít endpoint, smart defaults tối đa
2. **Resource-oriented** — REST nghiêm ngặt
3. **Action-oriented** — RPC-style
4. **Hybrid** — REST CRUD + action endpoints + view endpoints

### Hướng đã Chọn: Hybrid

Kết hợp REST chuẩn cho CRUD, action endpoints cho nghiệp vụ đặc biệt, và view endpoints cho calendar/summary. Khớp 100% với Architecture document.

### Lý do

1. Khớp chính xác với API Endpoint Summary trong Architecture document
2. Khớp với bề mặt API trong PRD
3. Thực dụng — CRUD chuẩn + action cho nghiệp vụ đặc biệt
4. Frontend-friendly — pattern nhất quán dễ đoán

### Phân loại Endpoint

| Loại | Pattern | Ví dụ |
|------|---------|-------|
| CRUD chuẩn | RESTful | `GET/POST/PUT/DELETE /work-logs` |
| Hành động đặc biệt | `POST /:id/action` | `/work-logs/:id/unlock` |
| View chuyên biệt | `GET /view-name` | `/work-logs/calendar` |
| Báo cáo & Export | `GET /reports/type[/export]` | `/reports/monthly/export` |
| Tìm kiếm | `GET /search?q=` | `/projects/search?q=` |
| Sub-resource | `POST /:id/sub` | `/work-logs/:id/comments` |

## Luồng Journey Người dùng

### Journey 1: Ghi nhận Công việc Hàng ngày (UJ-01)

Luồng <15 giây — hành động định nghĩa sản phẩm.

- Auth → lấy defaults → gõ content → POST → 201 xác nhận
- Nhánh lỗi: 422 + code + suggestion cho vi phạm nghiệp vụ
- Smart defaults: projectId = gần nhất, executionDate = hôm nay

### Journey 2: Quản lý Nhận xét (UJ-05)

Vòng phản hồi hai chiều bất đồng bộ.

- Quản lý xem báo cáo → nhận xét → notification gửi nhân viên
- Notification chứa actionLink dẫn thẳng đến WorkLog

### Journey 3: Xuất Báo cáo Excel (UJ-03)

Kết thúc chu kỳ tháng — 3 giây thay vì 3 ngày.

- Cùng bộ lọc với view báo cáo → GET export → trả .xlsx binary
- Filename: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`

### Journey 4: Mở khóa WorkLog (UJ-08)

Edge case — override khóa 3 ngày, bắt buộc audit trail.

- Quản lý gửi reason → lưu audit (unlockedBy, unlockedAt, unlockReason) → notification cho nhân viên
- Nhân viên cập nhật → tự khóa lại (isUnlocked: false)

### Mẫu Journey dùng chung

| Mẫu | Mô tả |
|------|--------|
| Auth gateway | Mọi flow bắt đầu bằng JWT validation |
| Smart defaults → minimal input | Lấy defaults → gửi ít field nhất |
| Filter → preview → export | Lọc → xem trước → tải file |
| Event → Notification | Hành động tạo event → notification cho bên liên quan |
| Validate → Error with guidance | Vi phạm nghiệp vụ → 422 + code + suggestion |

### Nguyên tắc Tối ưu Flow

1. Giảm bước đến giá trị — 1 field tạo WorkLog
2. Thông tin theo yêu cầu — không fetch thừa
3. Lỗi có đường thoát — mọi error chứa suggestion
4. Xác nhận tức thì — response đủ dữ liệu, không cần GET lại

## Chiến lược DTO (Component)

### DTO Tái sử dụng từ Module Hiện có

| DTO | Nguồn | Mức tái sử dụng |
|-----|-------|----------------|
| Base DTO (id, version, createdAt, updatedAt) | Product/Order | 100% |
| Paginated List Response | Pattern hiện có | 100% |

### DTO Tùy biến

1. **WorkLog DTO** — component cốt lõi, bao gồm isEditable, editWindowClosesAt, comments lồng
2. **Calendar Day DTO** — component mới, isBusinessDay, hasWorkLog, isEditable per ngày
3. **Summary View DTO** — component mới, completionRate, editableGaps, projectBreakdown
4. **Monthly Report DTO** — bảng báo cáo, WorkLog DTO lồng, phân trang
5. **Notification DTO** — actionLink dẫn thẳng đến hành động
6. **Error Response DTO** — code + message + suggestion + details, format nhất quán

### Chiến lược Triển khai

| Giai đoạn | DTO | Lý do |
|-----------|-----|-------|
| 1 - Core | Error Response, WorkLog, Defaults | Luồng <15 giây |
| 2 - Report | Monthly Report, Project | Xem & lọc báo cáo |
| 3 - View | Calendar Day, Summary View | Calendar & Summary |
| 4 - Notification | Notification, Preference | Hệ thống thông báo |
| 5 - Export | Binary response từ Report DTO | Xuất Excel |

## Mẫu Nhất quán UX (API)

### Mẫu Phản hồi

| Hoạt động | Status | Response |
|-----------|--------|----------|
| Tạo resource | 201 | Full DTO + Location header |
| Cập nhật resource | 200 | Full DTO (sau cập nhật) |
| Xóa resource | 200 | `{ deleted: true, id }` |
| Danh sách | 200 | `{ data: [], total, page, totalPages }` |
| Chi tiết | 200 | Full DTO |
| Xuất file | 200 | Binary + Content-Disposition |

### Bảng Error Code

| Code | HTTP | Ngữ cảnh |
|------|------|----------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai email/mật khẩu |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh token hết hạn |
| `AUTH_ACCOUNT_DISABLED` | 403 | Tài khoản bị vô hiệu hóa |
| `AUTH_FORBIDDEN_ROLE` | 403 | Không đủ quyền |
| `WORKLOG_FUTURE_DATE` | 422 | executionDate là tương lai |
| `WORKLOG_EDIT_WINDOW_EXPIRED` | 422 | Quá 3 ngày làm việc |
| `WORKLOG_DUPLICATE` | 409 | Đã có WorkLog cho dự án+ngày |
| `WORKLOG_NOT_FOUND` | 404 | WorkLog không tồn tại |
| `WORKLOG_LOCKED` | 422 | Đã khóa, không thể sửa/xóa |
| `PROJECT_NOT_FOUND` | 404 | Dự án không tồn tại |
| `PROJECT_DUPLICATE_NAME` | 409 | Tên dự án đã tồn tại |
| `NOTIFICATION_NOT_FOUND` | 404 | Thông báo không tồn tại |

Format lỗi chuẩn: `{ statusCode, code, message, suggestion, details? }`

### Mẫu Validation

Field thiếu/sai kiểu/quá dài → 400 + `{ code: "VALIDATION_ERROR", details: [{ field, message }] }`

### Mẫu Phân trang

`?page=1&limit=20` + metadata `{ total, page, totalPages }`. Default limit=20, max=100. Sắp xếp: `?sortBy=executionDate&sortOrder=desc`.

### Mẫu Tìm kiếm & Lọc

- Fuzzy search: `?q=chuỗi`
- Lọc theo field: `?field=value`
- Kết hợp: `?month=05&employeeId=abc&projectId=xyz`

### Mẫu Trạng thái Đặc biệt

- Danh sách trống: 200 + `{ data: [], total: 0 }`
- Excel trống: 200 + file chỉ có header row
- Calendar trống: 200 + `hasWorkLog: false` per ngày

### Mẫu Phân quyền

| Role | Phạm vi |
|------|---------|
| Public | Chỉ `/auth/login`, `/auth/refresh` |
| Employee | Chỉ data của mình, tự động filter theo employeeId |
| Manager | Tất cả data + comment + unlock actions |

## Tương thích Client & Trải nghiệm Developer

### Chiến lược Tương thích

API sẵn sàng cho mọi loại client: web (tương lai), mobile (tương lai), CLI, browser download.

- **Payload nhẹ** — DTO chỉ chứa field cần thiết, không trả nested object sâu
- **Phân trang mặc định** — mọi danh sách limit=20, mobile không bị overload
- **Flat structure** — `projectName` trong WorkLog DTO, không bắt client gọi thêm
- **Date format chuẩn** — ISO 8601 UTC, client tự convert timezone

### Trải nghiệm Developer (DX)

| Khía cạnh | Quy tắc |
|-----------|---------|
| Tự giải thích | Error chứa code + message + suggestion |
| Nhất quán | Cùng field dùng cùng tên mọi nơi |
| Dự đoán được | Endpoint naming theo pattern Hybrid |
| Idempotent an toàn | PUT/DELETE không side effect ngoài chính nó |
| Versioned | Mỗi DTO có version field cho optimistic locking |
| Tiếng Việt | message + suggestion bằng tiếng Việt |

### Chiến lược Testing

| Loại | Mục tiêu |
|------|----------|
| Contract testing | Response shape khớp DTO spec |
| Error coverage | Mọi error code có test case |
| Pagination | Edge case: page vượt totalPages, limit=0 |
| Auth guard | Mọi endpoint trả 401 khi không JWT |
| Role guard | Employee không truy cập manager actions |
| Export | File .xlsx mở được, format đúng |
| Performance | Báo cáo <2s, xuất <5s, CRUD <500ms |

### Hướng dẫn Triển khai cho Developer

1. Controller trả DTO qua class-transformer, không trả entity thẳng
2. Domain error → map sang error response format ở exception filter
3. Request validation dùng class-validator DTO
4. Response include tên hiển thị (`projectName`, `employeeName`)
5. Date luôn serialize as ISO 8601 UTC string
6. Null field giữ nguyên, không omit
