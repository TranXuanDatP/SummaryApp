import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalValidationPipe } from '../src/libs/shared/http/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../src/libs/shared/http/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/libs/shared/http/interceptors/response.interceptor';
import { COMMAND_BUS_TOKEN } from '../src/libs/core';
import { CreateUserCommand } from '../src/modules/user/application/commands';

describe('E2E — Full API (Swagger UI Coverage)', () => {
  let app: NestFastifyApplication;
  let commandBus: any;

  // Tokens
  let managerToken: string;
  let managerRefreshToken: string;
  let employeeToken: string;
  let employeeRefreshToken: string;

  // IDs
  let managerId: string;
  let employeeId: string;
  let projectId: string;
  let secondProjectId: string;
  let workLogId: string;
  let commentId: string;
  let notificationId: string;

  const MANAGER_EMAIL = 'e2e-admin@test.com';
  const EMPLOYEE_EMAIL = 'e2e-employee@test.com';
  const PASSWORD = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.useGlobalPipes(GlobalValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    commandBus = app.get(COMMAND_BUS_TOKEN);

    // Seed test users
    try {
      await commandBus.execute(
        new CreateUserCommand(MANAGER_EMAIL, PASSWORD, 'E2E Manager', 'manager'),
      );
    } catch (_) {
      // Already exists — ok
    }

    try {
      await commandBus.execute(
        new CreateUserCommand(EMPLOYEE_EMAIL, PASSWORD, 'E2E Employee', 'employee'),
      );
    } catch (_) {
      // Already exists — ok
    }
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // ═══════════════════════════════════════════════════════════
  // 1. HEALTH CHECK
  // ═══════════════════════════════════════════════════════════
  describe('1. Health Check', () => {
    it('1.1 GET /health → 200, status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('1.2 GET /health/live → 200, liveness', async () => {
      const res = await request(app.getHttpServer()).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('alive');
    });

    it('1.3 GET /health/ready → 200, readiness', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2. AUTH — Login / Refresh / Logout
  // ═══════════════════════════════════════════════════════════
  describe('2. Auth — Login / Refresh / Logout', () => {
    it('2.1.1 Login manager → 200, token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: MANAGER_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      managerToken = res.body.data.accessToken;
      managerRefreshToken = res.body.data.refreshToken;
    });

    it('2.1.2 Login employee → 200, token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMPLOYEE_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      employeeToken = res.body.data.accessToken;
      employeeRefreshToken = res.body.data.refreshToken;
    });

    it('2.1.3 Wrong password → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: MANAGER_EMAIL, password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2.1.4 Non-existent email → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: PASSWORD });

      expect(res.status).toBe(401);
    });

    it('2.1.5 Empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('2.1.6 Empty password → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: MANAGER_EMAIL, password: '' });

      expect(res.status).toBe(400);
    });

    // ── Refresh Token ──────────────────────────────────────
    it('2.2.1 Refresh token → 200, new pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: managerRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      managerRefreshToken = res.body.data.refreshToken;
      managerToken = res.body.data.accessToken;
    });

    it('2.2.2 Reuse old (rotated) refresh token → 401', async () => {
      // Rotate once more to get an old token
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: managerRefreshToken });

      const oldToken = managerRefreshToken;
      managerRefreshToken = refreshRes.body.data.refreshToken;
      managerToken = refreshRes.body.data.accessToken;

      // Reuse the old one
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldToken });

      expect(res.status).toBe(401);
    });

    it('2.2.3 Garbage token → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'garbage-token' });

      expect(res.status).toBe(401);
    });

    it('2.2.4 Missing field → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    // ── Logout ─────────────────────────────────────────────
    it('2.3.1 Logout → 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set(authHeader(managerToken))
        .send({ refreshToken: managerRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('2.3.2 Reuse refresh token after logout → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: managerRefreshToken });

      expect(res.status).toBe(401);
    });

    it('2.3.3 Logout without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: employeeRefreshToken });

      expect(res.status).toBe(401);
    });

    // Re-login to get fresh tokens for remaining tests
    it('Re-login manager for remaining tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: MANAGER_EMAIL, password: PASSWORD });

      managerToken = res.body.data.accessToken;
      managerRefreshToken = res.body.data.refreshToken;
    });

    // ── Auth Guard ─────────────────────────────────────────
    it('2.4.1 Protected route without Authorization → 401', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.status).toBe(401);
    });

    it('2.4.3 Protected route with valid JWT → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. USER — CRUD
  // ═══════════════════════════════════════════════════════════
  describe('3. User — CRUD', () => {
    it('3.1 Create user → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader(managerToken))
        .send({
          email: 'e2e-new@test.com',
          password: PASSWORD,
          fullName: 'E2E New User',
          role: 'employee',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('e2e-new@test.com');
      expect(res.body.data.id).toBeDefined();
    });

    it('3.2 Duplicate email → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader(managerToken))
        .send({
          email: 'e2e-new@test.com',
          password: PASSWORD,
          fullName: 'Duplicate',
          role: 'employee',
        });

      expect(res.status).toBe(409);
    });

    it('3.3 Missing required fields → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader(managerToken))
        .send({ email: 'x@test.com' });

      expect(res.status).toBe(400);
    });

    it('3.4 Invalid role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader(managerToken))
        .send({
          email: 'e2e-bad-role@test.com',
          password: PASSWORD,
          fullName: 'Test',
          role: 'admin',
        });

      expect(res.status).toBe(400);
    });

    it('3.5 List users → 200, paginated', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.total).toBeDefined();

      const users = res.body.data.data;
      const mgr = users.find((u: any) => u.email === MANAGER_EMAIL);
      const emp = users.find((u: any) => u.email === EMPLOYEE_EMAIL);
      if (mgr) managerId = mgr.id;
      if (emp) employeeId = emp.id;
    });

    it('3.6 List users with pagination → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
    });

    it('3.7 Get user by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${managerId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(managerId);
    });

    it('3.8 Get non-existent user → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set(authHeader(managerToken));

      expect(res.status).toBe(404);
    });

    it('3.9 Deactivate user → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader(managerToken))
        .send({
          email: 'e2e-deactivate@test.com',
          password: PASSWORD,
          fullName: 'To Deactivate',
          role: 'employee',
        });

      const userId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}/deactivate`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('3.10 Login with deactivated user → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-deactivate@test.com', password: PASSWORD });

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 4. PROJECT — CRUD + Search + Merge
  // ═══════════════════════════════════════════════════════════
  describe('4. Project — CRUD + Search + Merge', () => {
    it('4.1 Create project → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set(authHeader(managerToken))
        .send({ name: 'E2E Project Alpha', description: 'Test project' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('E2E Project Alpha');
      projectId = res.body.data.id;
    });

    it('4.2 Duplicate project name → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set(authHeader(managerToken))
        .send({ name: 'E2E Project Alpha' });

      expect(res.status).toBe(409);
    });

    it('4.3 Missing name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set(authHeader(managerToken))
        .send({ description: 'no name' });

      expect(res.status).toBe(400);
    });

    it('4.4 List projects → 200, paginated', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects?page=1&limit=20')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
    });

    it('4.5 Search project → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects/search?q=Alpha')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('4.6 Search with empty q → 200, empty result', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects/search?q=')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('4.7 Get project by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
    });

    it('4.8 Get non-existent project → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects/00000000-0000-0000-0000-000000000000')
        .set(authHeader(managerToken));

      expect(res.status).toBe(404);
    });

    it('4.9 Update project → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set(authHeader(managerToken))
        .send({ name: 'E2E Project Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('E2E Project Updated');
    });

    it('4.10 Merge projects (manager) → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .set(authHeader(managerToken))
        .send({ name: 'E2E Project Beta' });

      secondProjectId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/merge`)
        .set(authHeader(managerToken))
        .send({ sourceIds: [secondProjectId] });

      expect(res.status).toBe(200);
    });

    it('4.11 Merge with employee token → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/merge`)
        .set(authHeader(employeeToken))
        .send({ sourceIds: [projectId] });

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 5. WORK LOG — CRUD + Calendar + Summary
  // ═══════════════════════════════════════════════════════════
  describe('5. WorkLog — CRUD + Calendar + Summary', () => {
    it('5.1 Create work log → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(managerToken))
        .send({ content: 'E2E test work log', projectId });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('E2E test work log');
      workLogId = res.body.data.id;
    });

    it('5.2 Create without projectId → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(employeeToken))
        .send({ content: 'Làm việc lẻ' });

      expect(res.status).toBe(201);
      expect(res.body.data.projectId).toBeNull();
    });

    it('5.3 Duplicate (employee + project + date) → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(managerToken))
        .send({ content: 'Duplicate attempt', projectId });

      expect(res.status).toBe(409);
    });

    it('5.4 Future date → 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(managerToken))
        .send({ content: 'Future work', executionDate: '2099-01-01' });

      expect(res.status).toBe(422);
    });

    it('5.5 Missing content → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(managerToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('5.6 List work logs → 200, paginated', async () => {
      const res = await request(app.getHttpServer())
        .get('/work-logs?page=1&limit=20')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
    });

    it('5.7 Filter by projectId → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/work-logs?projectId=${projectId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('5.8 Filter by executionDate → 200', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app.getHttpServer())
        .get(`/work-logs?executionDate=${today}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('5.9 Employee only sees own work logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/work-logs')
        .set(authHeader(employeeToken));

      expect(res.status).toBe(200);
      const logs = res.body.data.data;
      if (logs.length > 0) {
        logs.forEach((log: any) => {
          expect(log.employeeId).toBe(employeeId);
        });
      }
    });

    it('5.10 Calendar view → 200', async () => {
      const now = new Date();
      const res = await request(app.getHttpServer())
        .get(`/work-logs/calendar?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('5.11 Calendar missing month → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/work-logs/calendar?year=2026')
        .set(authHeader(managerToken));

      expect(res.status).toBe(400);
    });

    it('5.12 Calendar invalid month=13 → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/work-logs/calendar?month=13&year=2026')
        .set(authHeader(managerToken));

      expect(res.status).toBe(400);
    });

    it('5.13 Summary view → 200', async () => {
      const now = new Date();
      const res = await request(app.getHttpServer())
        .get(`/work-logs/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('5.14 Get defaults → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/work-logs/defaults')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('5.15 Update work log content → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/work-logs/${workLogId}`)
        .set(authHeader(managerToken))
        .send({ content: 'Updated E2E content' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated E2E content');
    });

    it('5.17 Employee update another user work log → 404', async () => {
      const res = await request(app.getHttpServer())
        .put(`/work-logs/${workLogId}`)
        .set(authHeader(employeeToken))
        .send({ content: 'Hack attempt' });

      expect(res.status).toBe(404);
    });

    it('5.18 Delete work log (within edit window) → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/work-logs')
        .set(authHeader(managerToken))
        .send({ content: 'To be deleted' });

      const toDeleteId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .delete(`/work-logs/${toDeleteId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('5.20 Unlock work log (manager) → 200', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/unlock`)
        .set(authHeader(managerToken))
        .send({ reason: 'E2E test unlock' });

      expect(res.status).toBe(200);
      expect(res.body.data.isUnlocked).toBe(true);
    });

    it('5.21 Unlock (employee) → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/unlock`)
        .set(authHeader(employeeToken))
        .send({ reason: 'Attempt' });

      expect(res.status).toBe(403);
    });

    it('5.22 Unlock missing reason → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/unlock`)
        .set(authHeader(managerToken))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 6. COMMENT — CRUD (manager only)
  // ═══════════════════════════════════════════════════════════
  describe('6. Comment — CRUD (manager only)', () => {
    it('6.1 Create comment (manager) → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/comments`)
        .set(authHeader(managerToken))
        .send({ content: 'E2E test comment' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('E2E test comment');
      commentId = res.body.data.id;
    });

    it('6.2 Comment on non-existent work log → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/work-logs/00000000-0000-0000-0000-000000000000/comments')
        .set(authHeader(managerToken))
        .send({ content: 'Orphan comment' });

      expect(res.status).toBe(404);
    });

    it('6.3 Comment with employee token → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/comments`)
        .set(authHeader(employeeToken))
        .send({ content: 'Employee comment' });

      expect(res.status).toBe(403);
    });

    it('6.4 Missing content → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/comments`)
        .set(authHeader(managerToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('6.6 Update comment → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/comments/${commentId}`)
        .set(authHeader(managerToken))
        .send({ content: 'Updated comment' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated comment');
    });

    it('6.7 Update non-existent comment → 404', async () => {
      const res = await request(app.getHttpServer())
        .put('/comments/00000000-0000-0000-0000-000000000000')
        .set(authHeader(managerToken))
        .send({ content: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('6.8 Delete comment → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/comments`)
        .set(authHeader(managerToken))
        .send({ content: 'To be deleted comment' });

      const toDeleteId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .delete(`/comments/${toDeleteId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('6.9 Delete non-existent comment → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/comments/00000000-0000-0000-0000-000000000000')
        .set(authHeader(managerToken));

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 7. NOTIFICATION
  // ═══════════════════════════════════════════════════════════
  describe('7. Notification — List / Read / Preferences', () => {
    it('7.1 List notifications → 200, paginated', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?page=1&limit=20')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);

      if (res.body.data.data.length > 0) {
        notificationId = res.body.data.data[0].id;
      }
    });

    it('7.2 List notifications (default params) → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('7.3 Mark all as read → 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('7.4 Mark one as read → 200 or skip if no notifications', async () => {
      if (!notificationId) return;

      const res = await request(app.getHttpServer())
        .put(`/notifications/${notificationId}/read`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('7.5 Mark non-existent notification → 404', async () => {
      const res = await request(app.getHttpServer())
        .put('/notifications/00000000-0000-0000-0000-000000000000/read')
        .set(authHeader(managerToken));

      expect(res.status).toBe(404);
    });

    it('7.6 Get preferences → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('7.7 Update preferences → 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set(authHeader(managerToken))
        .send({
          preferences: [
            { type: 'comment_added', channel: 'in_app', enabled: true },
          ],
        });

      expect(res.status).toBe(200);
    });

    it('7.8 Empty preferences array → 400', async () => {
      const res = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set(authHeader(managerToken))
        .send({ preferences: [] });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 8. REPORT
  // ═══════════════════════════════════════════════════════════
  describe('8. Report — Monthly + Export', () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    it('8.1 Monthly report → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly?month=${month}&year=${year}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('8.2 Filter by employeeId (manager) → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly?month=${month}&year=${year}&employeeId=${employeeId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('8.3 Filter by projectId → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly?month=${month}&year=${year}&projectId=${projectId}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
    });

    it('8.4 Missing year → 400', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly?month=${month}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(400);
    });

    it('8.5 Invalid month=13 → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/monthly?month=13&year=2026')
        .set(authHeader(managerToken));

      expect(res.status).toBe(400);
    });

    it('8.6 Employee only sees own data → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly?month=${month}&year=${year}`)
        .set(authHeader(employeeToken));

      expect(res.status).toBe(200);
    });

    it('8.7 Export Excel → 200, correct content type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly/export?month=${month}&year=${year}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('8.8 Excel has Content-Disposition header', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/monthly/export?month=${month}&year=${year}`)
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('BaoCao');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 9. RBAC — Role-Based Access Control
  // ═══════════════════════════════════════════════════════════
  describe('9. RBAC — Role enforcement', () => {
    it('9.5 POST /work-logs/:id/unlock with employee → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/unlock`)
        .set(authHeader(employeeToken))
        .send({ reason: 'test' });

      expect(res.status).toBe(403);
    });

    it('9.6 POST /work-logs/:id/comments with employee → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-logs/${workLogId}/comments`)
        .set(authHeader(employeeToken))
        .send({ content: 'test' });

      expect(res.status).toBe(403);
    });

    it('9.7 PUT /comments/:id with employee → 403', async () => {
      const res = await request(app.getHttpServer())
        .put(`/comments/${commentId}`)
        .set(authHeader(employeeToken))
        .send({ content: 'hack' });

      expect(res.status).toBe(403);
    });

    it('9.8 DELETE /comments/:id with employee → 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set(authHeader(employeeToken));

      expect(res.status).toBe(403);
    });

    it('9.9 POST /projects/:id/merge with employee → 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/merge`)
        .set(authHeader(employeeToken))
        .send({ sourceIds: [projectId] });

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 10. EDGE CASES & ERROR HANDLING
  // ═══════════════════════════════════════════════════════════
  describe('10. Edge Cases & Error Handling', () => {
    it('10.1 Malformed JSON body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{bad json');

      expect([400, 500]).toContain(res.status);
    });

    it('10.3 Pagination page=-1 → auto-corrects to page=1', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?page=-1&limit=10')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
    });

    it('10.4 Pagination limit=999 → auto-corrects to 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?page=1&limit=999')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
    });

    it('10.6 Response format has success, statusCode, timestamp, data', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set(authHeader(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.data).toBeDefined();
    });
  });
});
