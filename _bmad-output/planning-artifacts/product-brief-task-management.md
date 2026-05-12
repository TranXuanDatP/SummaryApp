---
title: "Product Brief: Quản lý Công việc"
status: "complete"
created: "2026-05-09"
updated: "2026-05-09"
inputs:
  - "_bmad-output/planning-artifacts/prd-task-management.md"
  - "docs/PROJECT_PATTERNS.md"
---

# Product Brief: Quản lý Công việc

## Tóm tắt Điều hành

Cuối tháng, quản lý mất 2-3 ngày tổng hợp báo cáo từ Excel rời rạc, tin nhắn Zalo, và giấy tờ. Nhân viên không nhận được phản hồi. Không ai biết dự án có đi đúng hướng không cho đến khi quá muộn.

**Quản lý Công việc** là module tích hợp vào hệ thống NestJS hiện có, giải quyết triệt để bài toán báo cáo cuối tháng: nhân viên ghi nhận kết quả làm việc hàng ngày theo từng nhiệm vụ, quản lý theo dõi và phản hồi trực tiếp, và báo cáo tháng xuất Excel chỉ bằng một cú click. **Không theo dõi giờ làm. Không quy trình phê duyệt. Tập trung vào kết quả, không phải mặt giờ.**

Module tận dụng kiến trúc DDD/CQRS sẵn có (Drizzle ORM, Fastify, CQRS buses, Unit of Work) để triển khai nhanh chóng trên nền tảng đã được kiểm chứng.

## Vấn đề

Tổ chức nhỏ và vừa tại Việt Nam đang quản lý công việc bằng ba công cụ: Google Sheets ai đó tạo từ 2019, nhóm chat Zalo, và giấy tờ. Kết quả:

- **Báo cáo thủ công tốn 2-3 ngày mỗi tháng** — quản lý phải thu thập, tổng hợp, đối chiếu, format lại từ nhiều nguồn khác nhau. Dễ sót, sai lệch, và không thể kiểm chứng.
- **Không có kênh phản hồi** — trong văn hóa công sở Việt Nam, quản lý thường tránh phản hồi trực tiếp (sợ mất thể diện), nhân viên ngại hỏi. Không ai được biết mình làm đúng hay sai cho đến cuối tháng.
- **Không có minh bạch** — quản lý không thấy tiến độ theo thời gian thực. Dự án có đang đi đúng hướng? Không ai biết.
- **Không có bằng chứng** — nhân viên làm việc chăm chỉ nhưng không có hồ sơ có cấu trúc để chứng minh. Đánh giá hiệu suất dựa trên cảm tính.

Đây không phải tiện ích bổ sung — đây là **lỗ hổng vận hành** gây tốn thời gian, thiếu trách nhiệm, và mất cơ hội cải thiện liên tục.

## Giải pháp

Một module tập trung, tối giản được tích hợp vào nền tảng NestJS hiện tại:

- **Nhân viên ghi nhận kết quả hàng ngày** — tạo WorkLog gắn với Dự án (không có tầng Task), ghi lại ngày thực hiện và nội dung công việc tự do
- **Kênh phản hồi có cấu trúc** — quản lý để lại nhận xét trực tiếp trên từng WorkLog, tạo kênh giao tiếp bất đồng bộ, áp lực thấp — phù hợp với văn hóa phản hồi tránh đối đầu trực tiếp
- **Xuất Excel một click** — báo cáo tháng tự động format: Ngày | Dự án | Nhiệm vụ | Chi tiết công việc | Nhận xét của sếp. Thay thế 2-3 ngày tổng hợp thủ công bằng 3 giây
- **Hệ thống thông báo chủ động** — nhắc nhở nhân viên ghi công việc cuối ngày, cảnh báo sắp hết hạn chỉnh sửa, thông báo khi quản lý nhận xét — tạo thói quen sử dụng mà không cần ai đốc thúc
- **Quy tắc 3 ngày làm việc** — nhân viên phải ghi nhận công việc trong vòng 3 ngày làm việc (không tính ngày nghỉ) kể từ ngày thực hiện, đảm bảo tính kỷ luật và dữ liệu kịp thời

**Triết lý cốt lõi:** Đo lường **kết quả đã hoàn thành**, không phải **thời gian ngồi ở bàn làm việc**. WorkLog ghi lại "đã làm được gì", không phải "đã ngồi bao lâu".

## Điều làm nên Sự khác biệt

Đối thủ thực sự không phải Jira hay Asana — đó là **cái Google Sheets ai đó tạo năm 2019** và **nhóm chat Zalo** mà mọi người đang dùng. So với "đối thủ thực tế" này:

| Yếu tố | Hiện trạng (Sheets + Zalo) | Quản lý Công việc |
|---------|---------------------------|-------------------|
| **Cấu trúc** | Dữ liệu tự do, mỗi người format khác nhau | Chuẩn hóa: Project → WorkLog (phẳng, nhanh) |
| **Phản hồi** | Chat bị trôi, không gắn với công việc cụ thể | Nhận xét gắn trực tiếp trên từng WorkLog |
| **Báo cáo** | Copy-paste, tổng hợp thủ công 2-3 ngày | Xuất Excel hoàn chỉnh trong 3 giây |
| **Tra cứu** | Không tìm lại được, không có lịch sử | Lưu trữ có cấu trúc, tìm kiếm theo tháng/dự án |
| **Chi phí** | Miễn phí nhưng tốn thời gian | Self-hosted, chi phí vận hành gần bằng không |

**Lợi thế chiến lược:** Kiến trúc DDD/CQRS với bounded-context rõ ràng cho phép module này tách thành microservice độc lập, white-label cho sản phẩm khác, hoặc nhúng vào hệ thống bên ngoài mà không cần refactor. Đây không chỉ là lợi thế kỹ thuật — mà là **khả năng mở rộng mô hình kinh doanh** sau này.

## Đối tượng Sử dụng

### Nhân viên (Primary User)
- Người ghi nhận công việc hàng ngày — cần quy trình nhanh hơn gửi file Excel qua Zalo
- **Động lực riêng:** Hồ sơ công việc có cấu trúc = bằng chứng cho đánh giá hiệu suất, xét tăng lương, hoặc chuyển công tác. "Ghi nhận để xây dựng hồ sơ của chính mình, không chỉ để báo cáo sếp."
- Xem lại lịch sử công việc và nhận phản hồi từ quản lý

### Quản lý (Primary User)
- Cần trả lời nhanh: "Tuần này đội ngũ đã làm gì?" mà không phải đợi cuối tháng
- Kênh phản hồi bất đồng bộ — phù hợp với văn hóa tránh đối đầu trực tiếp. Viết nhận xét trên WorkLog ít áp lực hơn gọi nhân viên vào phòng họp.
- Xuất báo cáo cho cấp trên hoặc khách hàng trong vài giây

### Admin (Secondary User)
- Quản lý tài khoản và phân quyền (v1: qua CLI/migration)
- Mô hình tổ chức phẳng: quản lý thấy TẤT CẢ nhân viên — phù hợp tổ chức dưới 50 người

## Hành vi Người dùng (User Behavior Scenarios)

Thiết kế sản phẩm xoay quanh các hành vi lặp lại — thói quen hàng ngày, tương tác hàng tuần, và chu kỳ hàng tháng. Mỗi hành vi được thiết kế để giảm ma sát và tăng giá trị cho người dùng.

### HB-1: Ghi chép hàng ngày (Daily Habit)

**Ai:** Nhân viên
**Tần suất:** Mỗi ngày làm việc
**Thời gian dự kiến:** < 15 giây (one-click entry)

> Cuối mỗi ngày làm việc, nhân viên mở hệ thống — **dự án đã được tự động chọn** (dự án gần nhất), chỉ cần gõ nội dung vào ô duy nhất và nhấn Enter. Zero friction.

**Luồng tương tác:**
1. Nhận nhắc nhở (5:30 PM) nếu chưa ghi công việc hôm nay → click vào notification
2. Mở màn hình ghi nhận → hệ thống tự động chọn Dự án gần nhất (smart default)
3. Gõ nội dung công việc (`content`) — tự do, không giới hạn — vào ô duy nhất
4. Nhấn Enter → lưu xong trong < 15 giây
5. Nếu muốn đổi dự án → gõ tìm kiếm/tạo mới (HB-2)

**Giá trị:** Biến việc báo cáo thành phản xạ vô thức — nhanh hơn gửi tin nhắn Zalo. Mục tiêu < 15 giây mỗi lần ghi。

**Thông báo hỗ trợ:**
| Kích hoạt | Kênh | Nội dung |
|-----------|------|----------|
| 5:30 PM, chưa có WorkLog hôm nay | In-app + Email | "Bạn chưa ghi nhận công việc hôm nay. Chỉ mất 2 phút!" |
| Còn 1 ngày trước khi hết hạn 3 ngày | In-app | "WorkLog ngày {date} sắp bị khóa. Kiểm tra và chỉnh sửa ngay。" |

------

### HB-2: Chọn Dự án — Search-first Creation

**Ai:** Nhân viên
**Tần suất:** Khi cần đổi dự án (không phải mỗi lần — HB-1 có smart default)

> Nhân viên gõ tìm kiếm tên Dự án — hệ thống gợi ý kết quả phù hợp (fuzzy matching). Nếu không tìm thấy, nút "Tạo Dự án mới" hiện ra ngay tại chỗ. Không có tầng Task — cấu trúc phẳng Project → WorkLog.

**Luồng tương tác:**
1. Gõ tìm kiếm Project → hệ thống gợi ý dự án đang active (tìm kiếm fuzzy)
2. Chọn từ kết quả → hoặc nhấn "Tạo Project mới" nếu kết quả trống
3. Project mới tạo hiển thị chung cho toàn công ty — mọi người dùng lại được

**Giá trị:** Loại bỏ nút thắt cổ chai từ quản lý. Nhân viên tự chủ ghi nhận ngay lập tức. Không có tầng Task nghĩa là không cần chờ ai giao việc。

------

### HB-3: Tương tác phản hồi (Feedback Loop)

**Ai:** Quản lý + Nhân viên
**Tần suất:** Hàng tuần hoặc khi cần

> Thay vì nút "Duyệt" khô khan, quản lý lướt qua danh sách công việc và để lại nhận xét nhanh hoặc đặt câu hỏi ngay dưới kết quả đó. Nhân viên nhận được thông báo và có thể phản hồi lại.

**Luồng tương tác (Quản lý):**
1. Mở báo cáo tuần/tháng → lọc theo nhân viên hoặc dự án
2. Đọc WorkLog → nhận xét trực tiếp dưới từng entry (free-text)
3. Có thể @-tag hoặc đặt câu hỏi cụ thể: "Kết quả test thế nào?"
4. Không có "Duyệt/Từ chối" — phản hồi mang tính tư vấn, không mang tính hành chính

**Luồng tương tác (Nhân viên):**
1. Nhận notification khi được nhận xét
2. Đọc phản hồi → hiểu yêu cầu/định hướng từ quản lý
3. Điều chỉnh công việc ngày hôm sau dựa trên phản hồi

**Giá trị:** Biến phần mềm thành kênh giao tiếp công việc hai chiều. Giải quyết vấn đề ngay khi còn mới, thay vì đợi kỳ họp cuối tháng. Phù hợp văn hóa Việt Nam — phản hồi viết ít áp lực hơn nói chuyện trực tiếp.

**Thông báo hỗ trợ:**
| Kích hoạt | Kênh | Nội dung |
|-----------|------|----------|
| Quản lý nhận xét trên WorkLog | In-app + Email (nhân viên) | "{manager} đã nhận xét về công việc ngày {date} của bạn" |

---

### HB-4: Tự rà soát (Self-Review)

**Ai:** Nhân viên
**Tần suất:** Cuối mỗi tuần / trước khi xuất báo cáo tháng

> Trước khi xuất file Excel, nhân viên xem lại tổng hợp công việc của mình — kiểm tra xem có ngày nào bỏ sót, kết quả nào cần bổ sung chi tiết.

**Luồng tương tác:**
1. Mở màn hình tổng hợp cá nhân → chọn tuần/tháng cần xem
2. Xem dạng **Calendar view** — ngày nào có WorkLog thì có đánh dấu, ngày nào trống thì nổi bật
3. Click vào ngày trống → bổ sung WorkLog (**chỉ nếu còn trong hạn 3 ngày** — xem Ràng buộc)
4. Click vào WorkLog hiện có → chỉnh sửa chi tiết nếu cần
5. Khi hài lòng → chuyển sang HB-5 (Xuất báo cáo)

**Giá trị:** Nhân viên tự chủ động về chất lượng báo cáo. Lưu ý: ngày trống quá 3 ngày sẽ **không thể điền bù** — Calendar View hiển thị rõ ngày nào còn có thể bổ sung vs. ngày nào đã khóa, để nhân viên nhận thức đúng khoảng thời gian còn lại.

**Thông báo hỗ trợ:**
| Kích hoạt | Kênh | Nội dung |
|-----------|------|----------|
| 5:00 PM thứ Sáu hàng tuần | Email | Tổng kết tuần: số ngày đã ghi / tổng ngày làm việc, nhận xét mới, ngày còn trống |

---

### HB-5: Kết thúc chu kỳ (Exporting)

**Ai:** Nhân viên + Quản lý
**Tần suất:** Hàng tháng

> Chỉ với một thao tác chọn "Tháng" và bấm "Xuất báo cáo" — người dùng có ngay file Excel chuyên nghiệp để gửi email, in ra, hoặc nộp cho sếp.

**Luồng tương tác:**
1. Chọn tháng/năm cần xuất
2. Chọn bộ lọc: theo dự án, theo nhân viên (quản lý)
3. Preview nhanh báo cáo trên màn hình
4. Click **"Xuất Excel"** → tải file `.xlsx` trong <3 giây
5. File name tự động: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`

**Giá trị:** Xóa bỏ hoàn toàn công đoạn "cày cuốc" làm file báo cáo thủ công mỗi cuối tháng. Từ 2-3 ngày tổng hợp xuống còn 3 giây.

---

### HB-6: Giám sát chủ động (Manager Dashboard Scan)

**Ai:** Quản lý
**Tần suất:** Hàng tuần / khi cần

> Quản lý không cần đợi cuối tháng. Bất kỳ lúc nào muốn biết "tuần này đội ngũ đang làm gì", chỉ cần mở báo cáo, chọn bộ lọc, và lướt qua.

**Luồng tương tác:**
1. Mở màn hình báo cáo → chọn tuần/tháng hiện tại
2. Lọc theo nhân viên (xem ai đang làm gì) hoặc theo dự án (tiến độ dự án)
3. Nhanh chóng nhận diện: ai đang chăm chỉ, ai bỏ trống, dự án nào đang chậm
4. Để lại nhận xét (HB-3) hoặc liên hệ trực tiếp

**Giá trị:** Giám sát theo thời gian thực thay vì phát hiện vấn đề khi đã quá muộn. Can thiệp sớm giúp dự án đi đúng hướng.

**Thông báo hỗ trợ:**
| Kích hoạt | Kênh | Nội dung |
|-----------|------|----------|
| Nhân viên không có WorkLog 2 ngày liên tiếp | In-app (quản lý) | "{employee} chưa ghi nhận công việc 2 ngày qua. Có thể cần hỗ trợ?" |
| Ngày làm việc đầu tiên của tháng mới | In-app + Email (quản lý) | "Báo cáo tháng {MM} đã sẵn sàng. Xem và nhận xét ngay." |
| Tạo Project mới nhưng chưa có Task được gán sau 2 ngày | In-app (quản lý) | "Dự án {name} chưa có task nào. Thêm task và gán nhân viên." |

---

### HB-7: Chuẩn hóa Dữ liệu — Merge Project (Manager)

**Ai:** Quản lý
**Tần suất:** Cuối tuần / cuối tháng, trước khi xuất báo cáo

> Do mọi người đều có quyền tạo Project, có thể xảy ra trùng lặp tên ("Dự án A" vs "DA_A"). Quản lý cần công cụ gộp các dự án trùng tên thành một, chuyển toàn bộ WorkLog sang dự án đích。

**Luồng tương tác:**
1. Quản lý mở danh sách Project → phát hiện trùng lặp
2. Chọn "Gộp dự án" → chọn dự án nguồn + dự án đích
3. Hệ thống chuyển toàn bộ WorkLog từ nguồn sang đích
4. Dự án nguồn bị đánh dấu archived
5. Báo cáo Excel phản ánh dữ liệu đã chuẩn hóa

**Giá trị:** Dữ liệu sạch trước khi xuất báo cáo. Không cần xóa WorkLog, chỉ cần gộp。
### Nguyên tắc thiết kế thông báo
- **Không spam** — mỗi loại thông báo tối đa 1 lần/ngày, không lặp lại
- **Có thể configure** — người dùng chọn nhận email, in-app, hoặc tắt từng loại
- **Hành động trực tiếp** — mỗi thông báo có link/nút dẫn thẳng đến hành động cần làm
- **Cron job based** — reminder nhắc nhở chạy bằng scheduled job (NestJS @Cron), event-triggered cho notification phản hồi

## Ràng buộc Nghiệp vụ (Business Constraints)

Các quy tắc sau là bất biến — không thể bỏ qua hoặc nới lỏng trong v1:

| # | Ràng buộc | Chi tiết |
|---|-----------|----------|
| C-1 | **Quy tắc khóa 3 ngày** | WorkLog chỉ có thể tạo/sửa/xóa trong vòng **3 ngày làm việc** (không tính ngày nghỉ, lễ) kể từ `executionDate`. Sau khi hết hạn, WorkLog bị **khóa vĩnh viễn** — nhân viên không thể điền bù, sửa, hay xóa. Chỉ quản lý mới có quyền mở khóa (override). |
| C-2 | **Không ghi tương lai** | `executionDate` không được là ngày trong tương lai. Chỉ ghi nhận công việc đã thực hiện. |
| C-3 | **Một WorkLog/ngày/task** | Mỗi nhân viên chỉ có thể tạo tối đa 1 WorkLog cho mỗi Task trong cùng một `executionDate`. Ngăn trùng lặp. |
| C-4 | **Tự do tạo Project** | Nhân viên có thể tự do tạo Project trực tiếp trong quá trình ghi WorkLog. Mọi Project được tạo ra đều hiển thị chung cho toàn công ty. Không có tầng Task — cấu trúc phẳng Project → WorkLog。 |
| C-5 | **Tìm kiếm trước khi tạo** | Để giảm thiểu rác dữ liệu, luồng UI bắt buộc nhân viên phải gõ tìm kiếm tên Project/Task; tính năng "Tạo mới" chỉ xuất hiện khi kết quả tìm kiếm trống. Kết hợp với đào tạo nội bộ quy tắc đặt tên. |
| C-6 | **Lưu vết Mở khóa (Audit Trail)** | Khi WorkLog đã quá hạn 3 ngày, chỉ Quản lý mới có quyền mở khóa (Override). Hành động này **bắt buộc** lưu lại: `unlockedBy` (ID quản lý), `unlockedAt` (thời gian), và `reason` (lý do mở khóa). Đảm bảo tính minh bạch và truy vết mọi ngoại lệ. |
| C-7 | **Phân quyền Hiển thị (Visibility)** | Nhân viên chỉ được xem, sửa, xóa WorkLog của **chính mình**. Nhân viên không được xem WorkLog của người khác trong cùng dự án — tránh so bì hoặc copy kết quả. Quản lý có quyền xem toàn bộ. |

## Tiêu chí Thành công

**Giai đoạn ra mắt (tháng đầu tiên):**
- 10 người dùng đầu tiên onboarded thành công
- Báo cáo tháng đầu tiên được xuất Excel thành công
- Hệ thống hoạt động ổn định, không có lỗi dữ liệu

**Giai đoạn duy trì (sau 3 tháng):**

| Chỉ số | Mục tiêu | Cách đo lường |
|--------|----------|---------------|
| Tỷ lệ ghi nhận thường xuyên | >80% nhân viên ghi nhận ít nhất 4 ngày/tuần | Truy vấn tự động hàng tuần từ DB |
| Tốc độ tạo báo cáo | <3 giây từ lúc click đến khi tải xong | Monitoring response time |
| Tương tác quản lý | >60% báo cáo tháng nhận được ít nhất 1 nhận xét | Truy vấn tự động hàng tháng |
| Báo cáo trống | <5% nhân viên có báo cáo tháng trống | Truy vấn tự động hàng tháng |
| Hiệu quả nhắc nhở | >50% WorkLog được tạo sau khi nhận nhắc nhở cuối ngày | Tracking notification → creation events |

## Rủi ro

### Rủi ro Dữ liệu rác (Data Garbage)

Do mở quyền tạo Project/Task cho mọi người dùng, dữ liệu có thể bị trùng lặp hoặc không chuẩn hóa (ví dụ: "Dự án A" và "DA_A").

**Biện pháp giảm thiểu:**
- **UX "Tìm trước, Tạo sau"** — nhân viên phải gõ tìm kiếm trước; nút "Tạo mới" chỉ hiện khi kết quả trống. Giảm đáng kể rủi ro trùng lặp do vô tình.
- **Đào tạo nội bộ** — quy tắc đặt tên dự án/nhiệm vụ thống nhất khi onboarding.
- **Rà soát định kỳ** — quản lý tổng hợp và chuẩn hóa lại tên dự án vào cuối tuần/cuối tháng trước khi xuất Excel.
- **Tìm kiếm fuzzy** — gợi ý dự án gần đúng khi nhân viên gõ, giúp phát hiện trùng lặp trước khi tạo mới.
- **Merge Project** — quản lý có thể gộp các dự án trùng tên thành một, chuyển toàn bộ WorkLog sang dự án đích (xem HB-7). Chuẩn hóa dữ liệu trước khi xuất báo cáo cuối tháng.

**Góc nhìn Kỹ thuật (NestJS / DDD):** Sự thay đổi này làm nhẹ gánh cho đội Dev trong v1. Các endpoint `POST /projects` chỉ cần `JwtAuthGuard` (đã đăng nhập) thay vì `@Roles('manager')`. Sau này, khi muốn "khóa lại", Dev chỉ việc thêm lại `@Roles('manager')` — cấu trúc dữ liệu không hề bị ảnh hưởng. **Loại bỏ hoàn toàn TaskModule** — cấu trúc phẳng Project → WorkLog giảm đáng kể độ phức tạp, không còn cross-module dependency. Tính năng Merge Project triển khai như một Command (`MergeProjectsCommand`) trong ProjectModule.

## Phạm vi

### Trong phạm vi v1
- Xác thực JWT với 2 vai trò: nhân viên và quản lý (xây mới, dự án chưa có module auth)
- Quản lý Project (CRUD — cả nhân viên và quản lý đều có thể tạo; tìm kiếm trước khi tạo). Không có tầng Task — cấu trúc phẳng.
- Ghi nhận WorkLog hàng ngày (tạo, sửa, xóa trong vòng 3 ngày làm việc; quá hạn chỉ quản lý mới mở khóa được)
- **Calendar View** — nhân viên xem WorkLog theo dạng lịch, ngày trống được highlight
- **Summary View** — tổng hợp nhanh công việc theo tuần/tháng
- Báo cáo tháng (xem và lọc theo tháng/nhân viên/dự án). Format Excel theo mẫu chuẩn: STT, Tên SP/Dự án, Tuần, Kế hoạch, Thực hiện, % Kết quả, Ý kiến, Ghi chú。
- Xuất báo cáo Excel (.xlsx) với format cố định
- Nhận xét của quản lý trên từng WorkLog
- **Hệ thống thông báo (Notification)** — xem chi tiết tại phần "Hành vi người dùng"

### Ngoài phạm vi v1
- Theo dõi giờ làm (time tracking)
- Quy trình phê duyệt/từ chối WorkLog
- Ứng dụng mobile
- Hỗ trợ multi-tenant / đa tổ chức
- Collaboration thời gian thực (WebSockets)
- Đính kèm tệp tin trên WorkLog
- Dashboard phân tích / biểu đồ

## Ngữ cảnh Kỹ thuật

Module được xây dựng vào nền tảng NestJS hiện có với kiến trúc DDD/CQRS hoàn chỉnh. Dự án đã có sẵn:
- **Core libs:** BaseEntity, AggregateRoot, ValueObject, DomainEvent, exceptions
- **Shared infrastructure:** CQRS buses, Drizzle DB, UnitOfWork, Outbox pattern, logging (Pino), health checks
- **Module hiện tại:** Product, Order — module mới tuân thủ cùng cấu trúc thư mục và quy ước đặt tên

Các module hiện tại không có quan hệ domain với Task Management — không cóintegration point giữa module mới và Product/Order.

## Tầm nhìn

Nếu thành công, trong 2-3 năm tới module này trở thành **nền tảng bằng chứng công việc** của tổ chức — nơi mọi kết quả làm việc được ghi nhận, mọi phản hồi được lưu trữ, mọi báo cáo được tạo tự động. Từ nền tảng này có thể phát triển:

- **Analytics:** Xu hướng năng suất theo thời gian, nhận diện nhân viên cần hỗ trợ
- **Đánh giá hiệu suất:** Dữ liệu WorkLog = bằng chứng khách quan cho KPI/OKR, thay thế đánh giá bằng cảm tính
- **Tích hợp HR/Payroll:** API mở để kết nối với hệ thống nhân sự, chấm công hiện có
- **Mobile app:** Ghi nhận công việc mọi lúc mọi nơi
- **Multi-tenant:** Kiến trúc bounded-context sẵn có giúp mở rộng cho nhiều tổ chức với ít technical debt

## Câu hỏi Mở

| # | Câu hỏi | Tầm quan trọng |
|---|---------|----------------|
| 1 | Có thực tế phỏng vấn nhân viên/quản lý nào xác nhận vấn đề này không? | Cao — cần xác thực trước khi khóa phạm vi |
| 2 | Quy mô tổ chức mục tiêu cho v1? Phạm vi pilot nên là 1 đội ngũ 10-15 người | Cao — quyết định UX và mô hình dữ liệu |
| 3 | Dữ liệu dự án/task hiện có (trong Excel/Sheets) có cần migration không? | Trung bình — ảnh hưởng trải nghiệm ngày đầu |
| 4 | Format Excel xuất ra sẽ được dùng cho quy trình nào tiếp theo? (payroll, khách hàng, nội bộ?) | Trung bình — format sẽ trở thành chuẩn, khó thay đổi sau này |

---

*Product Brief được tạo bởi Mary (Business Analyst) — BMAD Method v6.6.0*
