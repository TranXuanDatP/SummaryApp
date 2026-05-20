# Testing Guide

## Prerequisites

- Docker Desktop đang chạy
- Node.js >= 18
- Đã cài dependencies: `npm install`

---

## Step 1: Start Docker (PostgreSQL + Redis)

```bash
docker-compose up -d
```

Kiểm tra containers đang chạy:

```bash
docker ps
```

Phải thấy 2 containers: `nestjs-ddd-postgres` (port 5433) và `nestjs-ddd-redis` (port 6379).

> **Nếu port 5433 hoặc 6379 bị chiếm**: Dừng container cũ trước: `docker-compose down`

---

## Step 2: Database Migration

### Quy trình đúng (KHÔNG bị lỗi Drizzle)

```bash
# 1. Generate migration từ schema thay đổi
npm run db:generate

# 2. Apply migration lên database
npm run db:migrate
```

### Tại sao hay bị lỗi

Lỗi phổ biến nhất là **chạy `db:migrate` trước khi Docker/PostgreSQL sẵn sàng**. Drizzle connect thẳng tới `postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project` (cứng trong `drizzle.config.ts`).

**Checklist trước khi migrate:**

1. Docker containers đang chạy (`docker ps`)
2. PostgreSQL đã healthy (đợi ~5s sau `docker-compose up`)
3. Database `nestjs_project` đã tồn tại (docker-compose tạo tự động qua env `POSTGRES_DB`)

### Verify migration thành công

```bash
node -e "const{Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project'});p.query('SELECT tablename FROM pg_tables WHERE schemaname = $$public$$ ORDER BY tablename').then(r=>{console.log(r.rows);p.end()}).catch(e=>{console.error(e.message);p.end()})"
```

Kết quả phải có 6 tables: `comments`, `outbox`, `projects`, `refresh_tokens`, `users`, `work_logs`.

---

## Step 3: Seed Users

```bash
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project' });
async function seed() {
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(\`INSERT INTO users (id, email, password, full_name, role, is_active, version, is_deleted, created_at, updated_at)
    VALUES (gen_random_uuid(), 'admin@test.com', \$1, 'Admin User', 'manager', true, 1, false, now(), now())
    ON CONFLICT (email) DO NOTHING\`, [hash]);
  await pool.query(\`INSERT INTO users (id, email, password, full_name, role, is_active, version, is_deleted, created_at, updated_at)
    VALUES (gen_random_uuid(), 'employee@test.com', \$1, 'Employee User', 'employee', true, 1, false, now(), now())
    ON CONFLICT (email) DO NOTHING\`, [hash]);
  const res = await pool.query('SELECT id, email, full_name, role FROM users ORDER BY created_at');
  console.log('Users:', JSON.stringify(res.rows, null, 2));
  pool.end();
}
seed();
"
```

---

## Step 4: Start Application

```bash
# Development mode (watch)
npm run start:dev

# Hoặc production build
npm run build && npm run start:prod
```

App chạy tại: `http://localhost:3000`
Swagger UI tại: `http://localhost:3000/api/docs`

---

## Test Accounts

| Email | Password | Role | Ghi chú |
|-------|----------|------|---------|
| `admin@test.com` | `password123` | **manager** | Full quyền: unlock work-logs, comment, xem report tất cả employees |
| `employee@test.com` | `password123` | **employee** | Chỉ xem/sửa work-logs của mình |

---

## Test Flow trên Swagger UI

### 1. Login lấy token

Mở `http://localhost:3000/api/docs`, vào endpoint `POST /auth/login`:

```json
{
  "email": "admin@test.com",
  "password": "password123"
}
```

Copy `accessToken` từ response.

### 2. Authorize

Click nút **Authorize** (khóa icon) trên Swagger UI, paste token vào ô **JWT-auth**, format: `token_của_bạn` (không cần thêm "Bearer ").

### 3. Test các endpoints theo thứ tự

| # | Endpoint | Method | Body / Params | Note |
|---|----------|--------|---------------|------|
| 1 | `/auth/login` | POST | `{email, password}` | Không cần auth |
| 2 | `/users` | GET | `?page=1&limit=20` | Danh sách users |
| 3 | `/projects` | POST | `{name, description?}` | Tạo project |
| 4 | `/projects` | GET | `?page=1&limit=20` | Danh sách projects |
| 5 | `/work-logs` | POST | `{content, projectId?, executionDate?}` | Tạo work log |
| 6 | `/work-logs` | GET | `?page=1&limit=20` | Danh sách work logs |
| 7 | `/work-logs/calendar` | GET | `?month=5&year=2026` | Calendar view |
| 8 | `/work-logs/summary` | GET | `?month=5&year=2026` | Summary stats |
| 9 | `/work-logs/defaults` | GET | - | Smart defaults cho form |
| 10 | `/work-logs/{id}/comments` | POST | `{content}` | Comment (manager only) |
| 11 | `/comments/{id}` | PUT | `{content}` | Sửa comment (manager only) |
| 12 | `/comments/{id}` | DELETE | - | Xóa comment (manager only) |
| 13 | `/reports/monthly` | GET | `?month=5&year=2026` | Báo cáo tháng |
| 14 | `/reports/monthly/export` | GET | `?month=5&year=2026` | Xuất Excel |
| 15 | `/auth/refresh` | POST | `{refreshToken}` | Refresh token |

---

## Dừng / Cleanup

```bash
# Dừng app (Ctrl+C hoặc)
taskkill /F /IM node.exe

# Dừng Docker containers (giữ data)
docker-compose stop

# Xóa hoàn toàn containers + data
docker-compose down -v
```
