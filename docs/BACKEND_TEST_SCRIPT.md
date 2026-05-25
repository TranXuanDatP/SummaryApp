# Kịch bản Test Backend — Summary API

> Môi trường: Backend `localhost:3000` + Frontend `localhost:5173`
>
> Frontend test script: [FRONTEND_TEST_SCRIPT.md](../../summary-ui/docs/FRONTEND_TEST_SCRIPT.md)
>
> E2E automated test: `test/app.e2e-spec.ts` (93 test cases) — chạy `npm run test:e2e`

---

## Chuẩn bị

### Bước 1: Start infrastructure

```bash
docker-compose up -d
```

Kiểm tra:

```bash
docker ps
# Phải thấy: nestjs-ddd-postgres (port 5433), nestjs-ddd-redis (port 6379)
```

> Đợi ~5 giây sau `docker-compose up` để PostgreSQL healthy.

### Bước 2: Database migration

```bash
# Sinh migration (chỉ khi có thay đổi schema)
npm run db:generate

# Apply migration
npm run db:migrate
```

> **KHÔNG** chạy `npx drizzle-kit migrate` trực tiếp. Luôn dùng `npm run db:migrate`.

### Bước 3: Build + Seed + Start

```bash
npm run build

# Seed users (bỏ qua nếu đã có)
npm run seed:user:prod -- -e "manager@test.com" -p "password123" -n "Admin User" -r manager
npm run seed:user:prod -- -e "emp@test.com" -p "password123" -n "Employee User" -r employee

NODE_ENV=production node dist/src/main.js
```

App: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`

---

## Test Accounts

> Giống hệt frontend test script.

| Email | Password | Role | Dùng cho |
|-------|----------|------|----------|
| `manager@test.com` | `password123` | **manager** | Đầy đủ quyền: CRUD users/projects/work-logs, unlock, comment, reports tất cả employees, notification preferences |
| `emp@test.com` | `password123` | **employee** | Quyền hạn chế: chỉ work-logs của mình, không unlock/comment/merge |

---

## Database (8 tables)

```
comments   notifications              notification_preferences
outbox     projects                   refresh_tokens
users      work_logs
```

---

## Response format

Mọi response wrap trong format chuẩn:

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-05-25T08:00:00.000Z",
  "data": { ... }
}
```

Error response:

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-05-25T08:00:00.000Z",
  "error": { "name": "...", "code": "ERROR_CODE", "message": "..." }
}
```

---

## 1. Health Check (3 endpoints, Public)

```
GET /health          ← @Public()
GET /health/live     ← @Public()
GET /health/ready    ← @Public()
```

| # | Test Case | curl | Expected |
|---|-----------|------|----------|
| 1.1 | Health check | `curl -s http://localhost:3000/health` | 200, `data.status: "ok"` |
| 1.2 | Liveness probe | `curl -s http://localhost:3000/health/live` | 200, `data.status: "alive"` |
| 1.3 | Readiness probe | `curl -s http://localhost:3000/health/ready` | 200, DB + Redis connected |

---

## 2. Auth — Đăng nhập / Token (3 endpoints)

### 2.1 Login

```
POST /auth/login     ← @Public(), không cần JWT
```

| # | Test Case | Body | Expected |
|---|-----------|------|----------|
| 2.1.1 | Login manager | `{"email":"manager@test.com","password":"password123"}` | 200, `data.accessToken` + `data.refreshToken` |
| 2.1.2 | Login employee | `{"email":"emp@test.com","password":"password123"}` | 200, token pair |
| 2.1.3 | Sai password | `{"email":"manager@test.com","password":"wrong"}` | 401 |
| 2.1.4 | Email không tồn tại | `{"email":"nobody@test.com","password":"password123"}` | 401 |
| 2.1.5 | Thiếu field | `{}` | 400, `VALIDATION_ERROR` |
| 2.1.6 | Password rỗng | `{"email":"manager@test.com","password":""}` | 400 |

### 2.2 Refresh Token

```
POST /auth/refresh   ← @Public(), không cần JWT
```

| # | Test Case | Body | Expected |
|---|-----------|------|----------|
| 2.2.1 | Refresh hợp lệ | `{"refreshToken":"<từ login>"}` | 200, token pair mới, token cũ bị revoke |
| 2.2.2 | Dùng lại token đã rotate | `{"refreshToken":"<token cũ>"}` | 401 |
| 2.2.3 | Token rác | `{"refreshToken":"garbage"}` | 401 |
| 2.2.4 | Thiếu field | `{}` | 400 |

### 2.3 Logout

```
POST /auth/logout    ← Cần JWT
```

| # | Test Case | Expected |
|---|-----------|----------|
| 2.3.1 | Logout + gửi refresh token hợp lệ | 200, `data.success: true` |
| 2.3.2 | Logout không có JWT header | 401 |
| 2.3.3 | Dùng lại refresh token sau logout | 401 |

### 2.4 Auth Guard

| # | Test Case | Expected |
|---|-----------|----------|
| 2.4.1 | API protected không có Authorization | 401 |
| 2.4.2 | API protected với JWT hết hạn | 401 |
| 2.4.3 | API protected với JWT hợp lệ | 200 |

---

## 3. User — Quản lý User (4 endpoints)

```
POST   /users              ← Cần JWT
GET    /users              ← Cần JWT
GET    /users/:id          ← Cần JWT
PATCH  /users/:id/deactivate  ← Cần JWT
```

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 3.1 | Tạo user mới | `POST /users` body `{"email":"new@test.com","password":"password123","fullName":"New User","role":"employee"}` | **201**, UserDto, header `Location: /users/<id>` |
| 3.2 | Trùng email | Dùng email đã tồn tại | 409 |
| 3.3 | Thiếu field bắt buộc | `{"email":"x@test.com"}` | 400 |
| 3.4 | Role không hợp lệ | `{"email":"x@test.com","password":"password123","fullName":"X","role":"admin"}` | 400 |
| 3.5 | List users | `GET /users` | 200, `{ data, total, page, totalPages }` |
| 3.6 | List users phân trang | `GET /users?page=1&limit=10` | 200, `page: 1` |
| 3.7 | Get user by ID | `GET /users/<id>` | 200, UserDto |
| 3.8 | User không tồn tại | `GET /users/00000000-0000-0000-0000-000000000000` | 404 |
| 3.9 | Deactivate user | `PATCH /users/<id>/deactivate` | 200, `isActive: false` |
| 3.10 | Login user đã deactivate | Login với user vừa deactivate | 403 |

> **Frontend tương ứng**: Users Page (section 4) — tạo user, deactivate, filter role, refresh.

---

## 4. Project — Quản lý Dự án (6 endpoints)

```
POST   /projects            ← Cần JWT
GET    /projects            ← Cần JWT
GET    /projects/search     ← Cần JWT
GET    /projects/:id        ← Cần JWT
PUT    /projects/:id        ← Cần JWT
POST   /projects/:id/merge  ← Cần JWT + @Roles('manager')
```

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 4.1 | Tạo project | `POST /projects` body `{"name":"Project Alpha","description":"Mô tả"}` | **201**, ProjectDto, header `Location: /projects/<id>` |
| 4.2 | Trùng tên | Dùng tên đã tồn tại | 409 |
| 4.3 | Thiếu name | `{"description":"no name"}` | 400 |
| 4.4 | List projects | `GET /projects?page=1&limit=20` | 200, paginated |
| 4.5 | Search project | `GET /projects/search?q=Alpha` | 200, search results |
| 4.6 | Search q rỗng | `GET /projects/search?q=` | 200, `data: [], total: 0` |
| 4.7 | Get by ID | `GET /projects/<id>` | 200, ProjectDto |
| 4.8 | Không tồn tại | `GET /projects/00000000-0000-0000-0000-000000000000` | 404 |
| 4.9 | Update project | `PUT /projects/<id>` body `{"name":"Updated"}` | 200 |
| 4.10 | Merge projects (manager) | `POST /projects/<id>/merge` body `{"sourceIds":["<id2>"]}` | **201** |
| 4.11 | Merge với employee token | Dùng employee JWT | 403 |

> **Frontend tương ứng**: Projects Page (section 5) — tạo, sửa, search, merge, merged status tag.

---

## 5. WorkLog — Ghi nhận Công việc (8 endpoints)

```
POST   /work-logs              ← Cần JWT
GET    /work-logs              ← Cần JWT
GET    /work-logs/calendar     ← Cần JWT
GET    /work-logs/summary      ← Cần JWT
GET    /work-logs/defaults     ← Cần JWT
PUT    /work-logs/:id          ← Cần JWT
DELETE /work-logs/:id          ← Cần JWT
POST   /work-logs/:id/unlock   ← Cần JWT + @Roles('manager')
```

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| **Create** ||||
| 5.1 | Tạo work log | `POST /work-logs` body `{"content":"Làm feature A","projectId":"<id>"}` | **201**, WorkLogDto, header `Location: /work-logs/<id>` |
| 5.2 | Tạo không có projectId | `{"content":"Làm việc lẻ"}` | **201**, `projectId: null` |
| 5.3 | Trùng (employee + project + date) | Gửi lại cùng body cùng user | 409 |
| 5.4 | Date tương lai | `{"content":"Test","executionDate":"2099-01-01"}` | 422 |
| 5.5 | Thiếu content | `{}` | 400 |
| **Read** ||||
| 5.6 | List work-logs | `GET /work-logs?page=1&limit=20` | 200, paginated |
| 5.7 | Lọc theo projectId | `GET /work-logs?projectId=<id>` | 200 |
| 5.8 | Lọc theo date | `GET /work-logs?executionDate=2026-05-25` | 200 |
| 5.9 | Employee chỉ thấy của mình | Dùng employee JWT | 200, tất cả `employeeId` = user |
| **Calendar & Summary** ||||
| 5.10 | Calendar | `GET /work-logs/calendar?month=5&year=2026` | 200, array calendar days |
| 5.11 | Calendar thiếu month | `GET /work-logs/calendar?year=2026` | 400 |
| 5.12 | Calendar month=13 | `GET /work-logs/calendar?month=13&year=2026` | 400 |
| 5.13 | Summary | `GET /work-logs/summary?month=5&year=2026` | 200, stats object |
| 5.14 | Defaults | `GET /work-logs/defaults` | 200, smart defaults |
| **Update / Delete** ||||
| 5.15 | Sửa content (trong edit window) | `PUT /work-logs/<id>` body `{"content":"Updated"}` | 200 |
| 5.16 | Sửa quá 3 ngày | Sửa work log cũ (> 3 ngày) | 422 |
| 5.17 | Employee sửa của user khác | Employee sửa work log của manager | 404 |
| 5.18 | Xóa (trong edit window) | `DELETE /work-logs/<id>` | 200, `deleted: true` |
| 5.19 | Xóa quá 3 ngày | `DELETE /work-logs/<id-cũ>` | 422 |
| **Unlock** ||||
| 5.20 | Unlock (manager) | `POST /work-logs/<id>/unlock` body `{"reason":"Yêu cầu"}` | 200, `isUnlocked: true` |
| 5.21 | Unlock (employee) | Dùng employee JWT | 403 |
| 5.22 | Unlock thiếu reason | body `{}` | 400 |

> **Frontend tương ứng**: Work Logs Page (section 6) + Calendar Page (section 7) — tạo, sửa, xóa, unlock, calendar, summary stats.

---

## 6. Comment — Phản hồi Quản lý (3 endpoints)

```
POST   /work-logs/:workLogId/comments  ← Cần JWT + @Roles('manager')
PUT    /comments/:id                    ← Cần JWT + @Roles('manager')
DELETE /comments/:id                    ← Cần JWT + @Roles('manager')
```

**Tất cả cần JWT + role manager. Employee chỉ xem được (nếu API list trả kèm).**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 6.1 | Tạo comment (manager) | `POST /work-logs/<id>/comments` body `{"content":"Tốt lắm"}` | **201**, CommentDto |
| 6.2 | Comment trên workLog không tồn tại | `POST /work-logs/00000000-.../comments` | 404 |
| 6.3 | Comment với employee token | Dùng employee JWT | 403 |
| 6.4 | Thiếu content | `{}` | 400 |
| 6.5 | Content > 2000 ký tự | `{"content":"<2001+ chars>"}` | 400 |
| 6.6 | Sửa comment | `PUT /comments/<id>` body `{"content":"Updated"}` | 200 |
| 6.7 | Sửa không tồn tại | `PUT /comments/00000000-...` | 404 |
| 6.8 | Xóa comment | `DELETE /comments/<id>` | 200, `deleted: true` |
| 6.9 | Xóa không tồn tại | `DELETE /comments/00000000-...` | 404 |
| 6.10 | Sửa/Xóa đã bị xóa | Thao tác trên comment đã xóa | 422 |

> **Frontend tương ứng**: Comments Page (section 8) — manager thêm/sửa/xóa, employee chỉ xem.

---

## 7. Notification — Thông báo (5 endpoints)

```
GET    /notifications               ← Cần JWT
PUT    /notifications/read-all      ← Cần JWT
PUT    /notifications/:id/read      ← Cần JWT
GET    /notifications/preferences   ← Cần JWT
PUT    /notifications/preferences   ← Cần JWT
```

### Valid notification types

```
daily_work_log_reminder, edit_window_closing, weekly_summary,
manager_no_activity_alert, monthly_report_ready, project_no_tasks,
comment_received, task_assigned
```

### Valid channels

```
in_app, email
```

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 7.1 | List notifications | `GET /notifications?page=1&limit=20` | 200, `{ data, total, page, totalPages }` |
| 7.2 | List mặc định | `GET /notifications` | 200 |
| 7.3 | Mark all as read | `PUT /notifications/read-all` | 200, `data.success: true` |
| 7.4 | Mark 1 as read | `PUT /notifications/<id>/read` | 200, `data.success: true` |
| 7.5 | Mark không tồn tại | `PUT /notifications/00000000-.../read` | 404 |
| 7.6 | Get preferences | `GET /notifications/preferences` | 200, `[{ id, type, channel, enabled }]` |
| 7.7 | Update preferences | `PUT /notifications/preferences` body `{"preferences":[{"type":"comment_received","channel":"in_app","enabled":true}]}` | 200 |
| 7.8 | Preferences array rỗng | `{"preferences":[]}` | 400 |

> **Frontend tương ứng**: Notifications Page (section 9) — list, mark read, mark all read, preferences toggle.

---

## 8. Report — Báo cáo (2 endpoints)

```
GET    /reports/monthly         ← Cần JWT
GET    /reports/monthly/export  ← Cần JWT
```

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 8.1 | Monthly report | `GET /reports/monthly?month=5&year=2026` | 200, paginated |
| 8.2 | Lọc employeeId (manager) | `GET /reports/monthly?month=5&year=2026&employeeId=<id>` | 200 |
| 8.3 | Lọc projectId | `GET /reports/monthly?month=5&year=2026&projectId=<id>` | 200 |
| 8.4 | Thiếu year | `GET /reports/monthly?month=5` | 400 |
| 8.5 | month/year không hợp lệ | `GET /reports/monthly?month=13&year=2026` | 400 |
| 8.6 | Employee chỉ xem của mình | Dùng employee JWT | 200, chỉ data của employee |
| 8.7 | Export Excel | `GET /reports/monthly/export?month=5&year=2026` | 200, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| 8.8 | Excel Content-Disposition | Kiểm tra header | `attachment; filename="BaoCao_Thang05_2026_..."` |

### Excel Export Format

Sheet name: `Tháng {M}`

```
Row 1:     (empty)
Row 2:     BÁO CÁO CÔNG VIỆC THÁNG {M}.{Y}       (merged A2:G2, Times New Roman 11pt, center)
Row 3:     Họ và Tên: {employeeName}               (C3, center)
Row 4:     Bộ phận: IT                              (C4, center)
Row 5:     (empty)
Row 6-7:   Header (2 rows, vertically merged)      (teal/blue fill, thin borders, center, wrapText)
           STT | NỘI DUNG CÔNG VIỆC | KẾ HOẠCH ĐẶT RA | THỰC HIỆN | KẾT QUẢ : % | Ý KIẾN ĐỀ XUẤT | GHI CHÚ
Row 8+:    Section (Roman I, II, III...)             (green #92D050 fill, thin borders)
           + Project name (merged B-G)
           Data rows:                                (thin borders, center, wrapText, height 28.8)
             Col A: (empty)
             Col B: "Tuần {N}"
             Col C: (empty — kế hoạch)
             Col D: aggregated work log content       (THỰC HIỆN)
             Col E: (empty — kết quả %)
             Col F: (empty — đề xuất)
             Col G: (empty — ghi chú)
           + 2 empty rows between weeks
```

Font: Times New Roman 11pt toàn bộ. Column widths: A=12.5, B=32.4, C=38.3, D=44.5, E=19.9, F=29.3, G=29.5.

> **Frontend tương ứng**: Reports Page (section 10) — filter month/employee/project, export Excel.

---

## 9. Role-based Access Control

| # | Endpoint | Role yêu cầu | Employee | Manager |
|---|----------|-------------|----------|---------|
| 9.1 | `POST /auth/login` | Public | OK | OK |
| 9.2 | `POST /auth/refresh` | Public | OK | OK |
| 9.3 | `GET /health` | Public | OK | OK |
| 9.4 | `GET /users` | JWT | OK | OK |
| 9.5 | `POST /work-logs` | JWT | OK | OK |
| 9.6 | `POST /work-logs/:id/unlock` | manager | **403** | OK |
| 9.7 | `POST /work-logs/:id/comments` | manager | **403** | OK |
| 9.8 | `PUT /comments/:id` | manager | **403** | OK |
| 9.9 | `DELETE /comments/:id` | manager | **403** | OK |
| 9.10 | `POST /projects/:id/merge` | manager | **403** | OK |

---

## 10. Edge Cases & Error Handling

| # | Test Case | Expected |
|---|-----------|----------|
| 10.1 | Body JSON malformed (`{bad json`) | 400 |
| 10.2 | Field không khai báo trong DTO | 400 (whitelist + forbidNonWhitelisted) |
| 10.3 | Pagination `page=-1` | Tự correct về `page=1` |
| 10.4 | Pagination `limit=999` | Tự correct về `limit=100` (MAX_PAGE_LIMIT) |
| 10.5 | Concurrent update cùng entity (optimistic lock) | 409 |
| 10.6 | Response format đúng chuẩn | `{ success, statusCode, timestamp, data }` |

---

## Tổng kết — 35 endpoints, 8 modules

| Module | Endpoints | Auth | Public |
|--------|-----------|------|--------|
| Health | 3 | - | 3 |
| Auth | 3 | 1 (logout) | 2 (login, refresh) |
| User | 4 | 4 | - |
| Project | 6 | 6 | - |
| WorkLog | 8 | 8 | - |
| Comment | 3 | 3 | - |
| Notification | 5 | 5 | - |
| Report | 2 | 2 | - |
| **Total** | **34** | **29** | **5** |

> **Automated E2E**: `test/app.e2e-spec.ts` — 93 test cases tự động, chạy `npm run test:e2e`.
>
> **Frontend manual test**: [FRONTEND_TEST_SCRIPT.md](../../summary-ui/docs/FRONTEND_TEST_SCRIPT.md) — 98 test cases.

---

## Thứ tự chạy test recommended

> Khớp với frontend test script — cùng data flow.

```
1.  Health Check        (verify app + DB + Redis)
2.  Auth Login          (lấy tokens cho các bước sau)
3.  User CRUD           (tạo user mới để test deactivate)
4.  Project CRUD        (tạo project → search → update → merge)
5.  WorkLog Create      (tạo work log với project → list → filter)
6.  Calendar + Summary  (xem calendar, summary stats, defaults)
7.  Comment CRUD        (manager thêm/sửa/xóa comment trên work log)
8.  Notification        (list, mark read, preferences)
9.  Report              (monthly report, filter, export Excel)
10. RBAC                (dùng employee token test 403)
11. Edge Cases          (malformed JSON, pagination auto-correct)
```
