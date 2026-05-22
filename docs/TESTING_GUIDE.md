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

### Quy trình ĐÚNG

```bash
# B1: Đảm bảo Docker đã start và PostgreSQL ready (đợi ~5s)
docker ps

# B2: Generate migration từ schema thay đổi (chỉ khi có code mới)
npm run db:generate

# B3: Apply migration lên database
npm run db:migrate
```

> **LUÔN dùng `npm run db:*`**, KHÔNG gọi `npx drizzle-kit` trực tiếp.
> npm scripts đảm bảo config nhất quán và tránh lỗi không cần thiết.

### Cách Drizzle hoạt động và tại sao hay bị lỗi

Drizzle KHÔNG chạy qua SQL file thủ công. Nó connect **trực tiếp** từ Node.js tới PostgreSQL bằng connection string cứng trong `drizzle.config.ts`:

```
drizzle.config.ts → dbCredentials.url = 'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project'
```

**Điều này có nghĩa là:**

- `npm run db:generate` — So sánh schema code (TypeScript) vs migration journal, **sinh file .sql mới** trong thư mục `drizzle/`. Không cần DB connection.
- `npm run db:migrate` — Đọc file `.sql` trong `drizzle/`, **connect trực tiếp vào PostgreSQL** và execute. **Cần DB connection.**

### Các lỗi thường gặp và cách fix

#### Lỗi 1: `ECONNREFUSED 127.0.0.1:5433`

```
Error: Connection refused 127.0.0.1:5433
```

**Nguyên nhân**: Docker chưa start, hoặc PostgreSQL chưa ready.

**Fix:**

```bash
# Check Docker đang chạy chưa
docker ps

# Nếu không thấy container → start
docker-compose up -d

# Đợi PostgreSQL healthy (~5 giây)
# Kiểm tra health
docker inspect nestjs-ddd-postgres --format='{{.State.Health.Status}}'
# Phải trả về: healthy
```

#### Lỗi 2: `database "nestjs_project" does not exist`

**Nguyên nhân**: Container PostgreSQL bị xóa và tạo lại, mất database.

**Fix:**

```bash
# Stop và xóa volumes cũ
docker-compose down -v

# Start lại (docker-compose tự tạo database qua env POSTGRES_DB)
docker-compose up -d

# Đợi healthy, rồi migrate lại từ đầu
npm run db:migrate
```

#### Lỗi 3: `relation "users" already exists` (migration conflict)

**Nguyên nhân**: Migration journal trong DB (`drizzle.__drizzle_migrations`) không khớp với file journal local (`drizzle/meta/_journal.json`). Xảy ra khi:
- Someone generate migration mới nhưng bạn chưa pull
- Dev local và DB out of sync
- Đã chạy SQL thủ công trước đó

**Fix:**

```bash
# Option A: Reset DB hoàn toàn (mất data)
docker-compose down -v
docker-compose up -d
sleep 5
npm run db:migrate

# Option B: Kiểm tra journal hiện tại
node -e "
const{Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project'});
p.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at').then(r=>{
  console.log('Applied migrations:');
  r.rows.forEach(m=>console.log(' ',m.hash,m.created_at));
  p.end();
}).catch(e=>{console.error(e.message);p.end()});
"
```

#### Lỗi 4: `npm run db:generate` báo `No schema changes, nothing to migrate`

**Đây KHÔNG phải lỗi.** Nghĩa là code schema hiện tại đã khớp với migration cuối cùng. Chỉ cần chạy `npm run db:migrate` để apply.

#### Lỗi 5: Table mới không xuất hiện sau `npm run db:migrate`

**Nguyên nhân**: Migration file `.sql` chưa được generate, hoặc generate nhưng không có thay đổi.

**Fix:**

```bash
# Kiểm tra migration files có trong thư mục drizzle/
ls drizzle/*.sql

# Nếu thiếu table mới (ví dụ comments, notifications):
# 1. Kiểm tra schema file tồn tại
ls src/modules/*/infrastructure/persistence/drizzle/schema/*.ts

# 2. Re-generate
npm run db:generate

# 3. Kiểm tra file .sql mới xuất hiện
ls -la drizzle/*.sql

# 4. Apply
npm run db:migrate

# 5. Verify
npm run db:studio    # Mở Drizzle Studio web UI để xem DB
```

### Migration files hiện tại

| File | Nội dung |
|------|----------|
| `0000_woozy_hemingway.sql` | Tables: `projects`, `users`, `refresh_tokens`, `outbox` (với indexes) |
| `0001_dry_corsair.sql` | Table: `work_logs` |
| `0002_tiresome_queen_noir.sql` | Alter: `projects` thêm cột `deleted_at` |
| `0003_square_dexter_bennett.sql` | Table: `work_logs` (cập nhật) |
| `0004_thick_mentor.sql` | Table: `comments` |
| `0005_stormy_bug.sql` | Tables: `notifications`, `notification_preferences` |

### Verify migration thành công

```bash
node -e "const{Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project'});p.query('SELECT tablename FROM pg_tables WHERE schemaname = $$public$$ ORDER BY tablename').then(r=>{console.log('Tables:',r.rows.map(x=>x.tablename).join(', '));p.end()}).catch(e=>{console.error(e.message);p.end()})"
```

Kết quả phải có 8 tables: `comments`, `notification_preferences`, `notifications`, `outbox`, `projects`, `refresh_tokens`, `users`, `work_logs`.

Hoặc dùng Drizzle Studio (web UI):

```bash
npm run db:studio
# Mở browser tại URL hiển thị trong terminal
```

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
| 13 | `/notifications` | GET | `?page=1&limit=20` | Danh sách thông báo |
| 14 | `/notifications/preferences` | GET | - | Notification preferences |
| 15 | `/reports/monthly` | GET | `?month=5&year=2026` | Báo cáo tháng |
| 16 | `/reports/monthly/export` | GET | `?month=5&year=2026` | Xuất Excel |
| 17 | `/auth/refresh` | POST | `{refreshToken}` | Refresh token |

---

## Quick Troubleshooting Summary

| Vấn đề | Lỗi | Cách fix |
|---------|-----|----------|
| Docker chưa start | `ECONNREFUSED 127.0.0.1:5433` | `docker-compose up -d`, đợi 5s |
| DB bị mất | `database does not exist` | `docker-compose down -v && docker-compose up -d` |
| Migration conflict | `relation already exists` | Reset DB: `docker-compose down -v` → up → migrate |
| Thiếu table | API 500 `Failed query` | `npm run db:generate && npm run db:migrate` |
| Không có schema changes | `No schema changes, nothing to migrate` | Bình thường, chỉ cần `npm run db:migrate` |
| App crash khi start | `ECONNREFUSED` trong log | Check Docker, check `.env` port khớp `docker-compose.yml` |

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
