# Kịch bản Test Backend — Production

> Môi trường: **Production** (`NODE_ENV=production`)
>
> Tất cả thao tác DB phải chạy qua **npm scripts**, KHÔNG gọi `drizzle-kit` trực tiếp.

---

## Chuẩn bị môi trường Production

### Bước 1: Start infrastructure

```bash
docker-compose up -d
```

Kiểm tra containers:

```bash
docker ps
# Phải thấy: nestjs-ddd-postgres (port 5433), nestjs-ddd-redis (port 6379)
```

> **Lưu ý**: Đợi ~5 giây sau `docker-compose up` để PostgreSQL healthy trước khi chạy bước tiếp theo.

### Bước 2: Database migration (qua npm)

```bash
# Sinh migration từ schema (chỉ chạy khi có thay đổi schema)
npm run db:generate

# Apply migration lên database
npm run db:migrate
```

> **KHÔNG** chạy `npx drizzle-kit migrate` trực tiếp. Luôn dùng `npm run db:migrate`.
>
> **Lý do**: `npm run` đảm bảo chạy đúng config, đúng environment, và nhất quán giữa các developer.
>
> **Lỗi thường gặp**: Nếu `npm run db:migrate` lỗi → kiểm tra Docker đã start chưa, đợi PostgreSQL ready.
> Xem chi tiết troubleshooting tại [TESTING_GUIDE.md](./TESTING_GUIDE.md).

### Bước 3: Build production

```bash
npm run build
```

### Bước 4: Seed users ban đầu

```bash
npm run seed:user:prod -- -e "manager@test.com" -p "password123" -n "Admin User" -r manager
npm run seed:user:prod -- -e "emp@test.com" -p "password123" -n "Employee User" -r employee
```

### Bước 5: Start production server

```bash
NODE_ENV=production node dist/src/main.js
```

App chạy tại: `http://localhost:3000`
Swagger UI tại: `http://localhost:3000/api/docs`

---

## Test Accounts

| Email | Password | Role | Dùng cho |
|-------|----------|------|----------|
| `manager@test.com` | `password123` | **manager** | Test đầy đủ quyền: unlock work-logs, comment, reports tất cả employees, notification preferences |
| `emp@test.com` | `password123` | **employee** | Test quyền hạn chế: chỉ work-logs của mình, không unlock/comment |

---

## Database hiện tại (8 tables)

```
comments                  notifications              notification_preferences
outbox                    projects                   refresh_tokens
users                     work_logs
```

---

## Quy ước response format

Mọi response đều wrap trong format chuẩn:

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-05-21T08:00:00.000Z",
  "data": { ... }
}
```

Error response:

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-05-21T08:00:00.000Z",
  "error": { "name": "...", "code": "ERROR_CODE", "message": "..." }
}
```

---

## 1. Health Check (3 endpoints, Public)

```
GET /health
GET /health/live
GET /health/ready
```

| # | Test Case | curl | Expected |
|---|-----------|------|----------|
| 1.1 | Health check | `curl -s http://localhost:3000/health` | 200, `{ success: true, data: { status: "ok" } }` |
| 1.2 | Liveness probe | `curl -s http://localhost:3000/health/live` | 200 |
| 1.3 | Readiness probe | `curl -s http://localhost:3000/health/ready` | 200, check DB + Redis connected |

---

## 2. Auth — Đăng nhập / Token (3 endpoints)

### 2.1 Login

```
POST /auth/login          ← @Public(), không cần JWT
```

| # | Test Case | Body | Expected |
|---|-----------|------|----------|
| 2.1.1 | Login manager | `{"email":"manager@test.com","password":"password123"}` | 200, trả về `{ accessToken, refreshToken }` |
| 2.1.2 | Login employee | `{"email":"emp@test.com","password":"password123"}` | 200, trả về token pair |
| 2.1.3 | Sai password | `{"email":"manager@test.com","password":"wrong"}` | 401, `AUTH_INVALID_CREDENTIALS` |
| 2.1.4 | Email không tồn tại | `{"email":"nobody@test.com","password":"password123"}` | 401, `AUTH_INVALID_CREDENTIALS` |
| 2.1.5 | Thiếu email | `{}` | 400, `VALIDATION_ERROR` |
| 2.1.6 | Password rỗng | `{"email":"manager@test.com","password":""}` | 400, `VALIDATION_ERROR` |

### 2.2 Refresh Token

```
POST /auth/refresh        ← @Public(), không cần JWT
```

| # | Test Case | Body | Expected |
|---|-----------|------|----------|
| 2.2.1 | Refresh hợp lệ | `{"refreshToken":"<từ login>"}` | 200, token pair mới, token cũ bị revoke |
| 2.2.2 | Dùng lại token đã rotate | `{"refreshToken":"<token cũ>"}` | 401, token revoked |
| 2.2.3 | Token rác | `{"refreshToken":"garbage"}` | 401 |
| 2.2.4 | Thiếu field | `{}` | 400, `VALIDATION_ERROR` |

### 2.3 Logout

```
POST /auth/logout         ← Cần JWT
```

| # | Test Case | Expected |
|---|-----------|----------|
| 2.3.1 | Logout với refresh token hợp lệ | 200, `{ success: true }` |
| 2.3.2 | Logout không có JWT header | 401 |
| 2.3.3 | Dùng lại refresh token sau logout | 401 |

### 2.4 Auth Guard

| # | Test Case | Expected |
|---|-----------|----------|
| 2.4.1 | Gọi API protected không có Authorization header | 401, `AUTH_TOKEN_EXPIRED` |
| 2.4.2 | Gọi API protected với JWT hết hạn | 401 |
| 2.4.3 | Gọi API protected với JWT hợp lệ | 200 |

---

## 3. User — Quản lý User (4 endpoints)

```
POST   /users
GET    /users
GET    /users/:id
PATCH  /users/:id/deactivate
```

**Tất cả cần JWT.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 3.1 | Tạo user mới | `{"email":"new@test.com","password":"password123","fullName":"New User","role":"employee"}` | 200, UserDto |
| 3.2 | Tạo user trùng email | Dùng email đã tồn tại | 409 |
| 3.3 | Thiếu field bắt buộc | `{"email":"x@test.com"}` | 400 |
| 3.4 | Role không hợp lệ | `{"email":"x@test.com","password":"password123","fullName":"X","role":"admin"}` | 400 |
| 3.5 | List users mặc định | `GET /users` | 200, `{ data, total, page, totalPages }` |
| 3.6 | List users phân trang | `GET /users?page=1&limit=10` | 200, pagination đúng |
| 3.7 | Get user by ID | `GET /users/<id>` | 200, UserDto |
| 3.8 | Get user không tồn tại | `GET /users/non-existent-id` | 404 |
| 3.9 | Deactivate user | `PATCH /users/<id>/deactivate` | 200, `isActive: false` |
| 3.10 | Login user đã deactivate | Login với user vừa deactivate | 403, `AUTH_ACCOUNT_DISABLED` |

---

## 4. Project — Quản lý Dự án (6 endpoints)

```
POST   /projects
GET    /projects
GET    /projects/search
GET    /projects/:id
PUT    /projects/:id
POST   /projects/:id/merge    ← @Roles('manager')
```

**Tất cả cần JWT.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 4.1 | Tạo project | `{"name":"Project Alpha","description":"Mô tả"}` | 200, ProjectDto, header `Location: /projects/<id>` |
| 4.2 | Tạo trùng tên | Dùng tên đã tồn tại | 409 |
| 4.3 | Thiếu name | `{"description":"no name"}` | 400 |
| 4.4 | List projects | `GET /projects?page=1&limit=20` | 200, paginated |
| 4.5 | Search project | `GET /projects/search?q=Alpha` | 200, search results |
| 4.6 | Search q rỗng | `GET /projects/search?q=` | 200, `{ data: [], total: 0 }` |
| 4.7 | Get by ID | `GET /projects/<id>` | 200, ProjectDto |
| 4.8 | Get không tồn tại | `GET /projects/non-existent` | 404 |
| 4.9 | Update project | `PUT /projects/<id>` body `{"name":"Updated"}` | 200 |
| 4.10 | Merge projects (manager) | `POST /projects/<id>/merge` body `{"sourceIds":["<id2>"]}` | 200 |
| 4.11 | Merge với employee token | Dùng employee JWT | 403 |

---

## 5. WorkLog — Ghi nhận Công việc (8 endpoints)

```
POST   /work-logs
GET    /work-logs
GET    /work-logs/calendar
GET    /work-logs/summary
GET    /work-logs/defaults
PUT    /work-logs/:id
DELETE /work-logs/:id
POST   /work-logs/:id/unlock    ← @Roles('manager')
```

**Tất cả cần JWT.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| **Create** ||||
| 5.1 | Tạo work log | `{"content":"Làm feature A","projectId":"<id>"}` | 200, WorkLogDto |
| 5.2 | Tạo không có projectId | `{"content":"Làm việc lẻ"}` | 200, `projectId: null` |
| 5.3 | Trùng (employee + project + date) | Gửi lại cùng body | 409, `WORKLOG_DUPLICATE` |
| 5.4 | Date tương lai | `{"content":"Test","executionDate":"2099-01-01"}` | 422, `WORKLOG_FUTURE_DATE` |
| 5.5 | Thiếu content | `{}` | 400 |
| **Read** ||||
| 5.6 | List work-logs | `GET /work-logs?page=1&limit=20` | 200, paginated |
| 5.7 | Lọc theo projectId | `GET /work-logs?projectId=<id>` | 200 |
| 5.8 | Lọc theo date | `GET /work-logs?executionDate=2026-05-20` | 200 |
| 5.9 | Employee chỉ thấy của mình | Dùng employee JWT, list | 200, tất cả `employeeId` = user |
| **Calendar & Summary** ||||
| 5.10 | Calendar | `GET /work-logs/calendar?month=5&year=2026` | 200, array 28-31 ngày |
| 5.11 | Calendar thiếu month | `GET /work-logs/calendar?year=2026` | 400 |
| 5.12 | Calendar month=13 | `GET /work-logs/calendar?month=13&year=2026` | 400 |
| 5.13 | Summary | `GET /work-logs/summary?month=5&year=2026` | 200, `{ period, totalBusinessDays, loggedDays, completionRate, editableGaps, projectBreakdown }` |
| 5.14 | Defaults | `GET /work-logs/defaults` | 200, `{ suggestedProjectId, suggestedProjectName, todayDate }` |
| **Update** ||||
| 5.15 | Sửa content (trong window) | `PUT /work-logs/<id>` body `{"content":"Updated"}` | 200 |
| 5.16 | Sửa quá 3 ngày | Sửa work log cũ | 422, `WORKLOG_LOCKED` |
| 5.17 | Sửa của user khác (employee) | Employee sửa work log của manager | 404 |
| **Delete** ||||
| 5.18 | Xóa (trong window) | `DELETE /work-logs/<id>` | 200, `{ deleted: true }` |
| 5.19 | Xóa quá 3 ngày | `DELETE /work-logs/<id-cũ>` | 422, `WORKLOG_LOCKED` |
| **Unlock** ||||
| 5.20 | Unlock (manager) | `POST /work-logs/<id>/unlock` body `{"reason":"Nhân viên yêu cầu"}` | 200, `isUnlocked: true` |
| 5.21 | Unlock (employee) | Dùng employee JWT | 403 |
| 5.22 | Unlock thiếu reason | `POST /work-logs/<id>/unlock` body `{}` | 400 |

---

## 6. Comment — Phản hồi Quản lý (3 endpoints)

```
POST   /work-logs/:workLogId/comments   ← @Roles('manager')
PUT    /comments/:id                     ← @Roles('manager')
DELETE /comments/:id                     ← @Roles('manager')
```

**Tất cả cần JWT + role manager.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 6.1 | Tạo comment (manager) | `POST /work-logs/<id>/comments` body `{"content":"Tốt lắm"}` | 200, CommentDto |
| 6.2 | Comment trên workLog không tồn tại | `POST /work-logs/non-existent/comments` | 404 |
| 6.3 | Comment với employee token | Dùng employee JWT | 403 |
| 6.4 | Thiếu content | `{}` | 400 |
| 6.5 | Content > 2000 ký tự | `{"content":"<2001+ chars>"}` | 400 |
| 6.6 | Sửa comment | `PUT /comments/<id>` body `{"content":"Updated"}` | 200, version +1 |
| 6.7 | Sửa không tồn tại | `PUT /comments/non-existent` | 404 |
| 6.8 | Xóa comment | `DELETE /comments/<id>` | 200, `{ deleted: true }` |
| 6.9 | Xóa không tồn tại | `DELETE /comments/non-existent` | 404 |
| 6.10 | Sửa/Xóa đã bị xóa | Thao tác trên comment đã xóa | 422, `COMMENT_ALREADY_DELETED` |

---

## 7. Notification — Thông báo (5 endpoints)

```
GET    /notifications
PUT    /notifications/read-all
PUT    /notifications/:id/read
GET    /notifications/preferences
PUT    /notifications/preferences
```

**Tất cả cần JWT.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 7.1 | List notifications | `GET /notifications?page=1&limit=20` | 200, `{ data, total, page, totalPages }` |
| 7.2 | List mặc định | `GET /notifications` | 200 |
| 7.3 | Mark all as read | `PUT /notifications/read-all` | 200, `{ success: true }` |
| 7.4 | Mark 1 as read | `PUT /notifications/<id>/read` | 200, `{ success: true }` |
| 7.5 | Mark không tồn tại | `PUT /notifications/non-existent/read` | 404 |
| 7.6 | Get preferences | `GET /notifications/preferences` | 200, `[{ id, type, channel, enabled }]` |
| 7.7 | Update preferences | `PUT /notifications/preferences` body `{"preferences":[{"type":"comment_added","channel":"in_app","enabled":true}]}` | 200 |
| 7.8 | Preferences array rỗng | `{"preferences":[]}` | 400, at least 1 required |

---

## 8. Report — Báo cáo (2 endpoints)

```
GET    /reports/monthly
GET    /reports/monthly/export
```

**Tất cả cần JWT.**

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 8.1 | Monthly report | `GET /reports/monthly?month=5&year=2026` | 200, paginated MonthlyReportEntryDto |
| 8.2 | Lọc employeeId (manager) | `GET /reports/monthly?month=5&year=2026&employeeId=<id>` | 200 |
| 8.3 | Lọc projectId | `GET /reports/monthly?month=5&year=2026&projectId=<id>` | 200 |
| 8.4 | Thiếu month/year | `GET /reports/monthly?month=5` | 400 |
| 8.5 | month/year không hợp lệ | `GET /reports/monthly?month=13&year=2026` | 400 |
| 8.6 | Employee chỉ xem của mình | Dùng employee JWT | 200, chỉ data của employee |
| 8.7 | Export Excel | `GET /reports/monthly/export?month=5&year=2026` | 200, Content-Type: `.spreadsheetml.sheet` |
| 8.8 | Excel có Content-Disposition | Kiểm tra response header | `attachment; filename="BaoCao_..."` |

---

## 9. Role-based Access Control — Tổng hợp

| # | Endpoint | Role yêu cầu | Employee | Manager |
|---|----------|-------------|----------|---------|
| 9.1 | `POST /auth/login` | Public | OK | OK |
| 9.2 | `POST /auth/refresh` | Public | OK | OK |
| 9.3 | `GET /users` | JWT | OK | OK |
| 9.4 | `POST /work-logs` | JWT | OK | OK |
| 9.5 | `POST /work-logs/:id/unlock` | manager | **403** | OK |
| 9.6 | `POST /work-logs/:id/comments` | manager | **403** | OK |
| 9.7 | `PUT /comments/:id` | manager | **403** | OK |
| 9.8 | `DELETE /comments/:id` | manager | **403** | OK |
| 9.9 | `POST /projects/:id/merge` | manager | **403** | OK |

---

## 10. Edge Cases & Error Handling

| # | Test Case | Expected |
|---|-----------|----------|
| 10.1 | Body JSON malformed (`{bad json`) | 400 |
| 10.2 | Field không khai báo trong DTO (`forbidNonWhitelisted`) | 400, field bị strip + warning |
| 10.3 | Pagination `page=-1` | Tự correct về page=1 |
| 10.4 | Pagination `limit=999` | Tự correct về limit=100 (MAX_PAGE_LIMIT) |
| 10.5 | Concurrent update cùng entity (optimistic lock) | 409, `CONCURRENCY_ERROR` |
| 10.6 | Response format đúng chuẩn | `{ success, statusCode, timestamp, data }` |

---

## Tổng kết — 35 endpoints, 6 modules

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

---

## Thứ tự chạy test recommended

```
1. Health Check (verify app + DB + Redis)
2. Auth Login (lấy tokens cho các bước sau)
3. User CRUD
4. Project CRUD + Search
5. WorkLog Create → Read → Calendar → Summary → Defaults
6. Comment Create → Update → Delete
7. Notification List → Mark Read → Preferences
8. Report Monthly → Export Excel
9. Role-based (dùng employee token test 403)
10. Edge Cases
```
