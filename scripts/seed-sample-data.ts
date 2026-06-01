/**
 * Seed Sample Data — May 2026
 *
 * Tạo dữ liệu mẫu cho tháng 5/2026:
 * - 1 Manager + 4 Employees
 * - 4 Projects, mỗi project 2-3 Sprints
 * - Mỗi employee có 3-4 Work Logs mỗi sprint
 *
 * Chạy: npx ts-node scripts/seed-sample-data.ts
 */

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project';

const SALT_ROUNDS = 10;
const MAY_2026 = {
  year: 2026,
  month: 5, // 1-based
};

// ────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────

function workingDaysInMay2026(): Date[] {
  const days: Date[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 4, d); // month is 0-based
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) days.push(date);
  }
  return days;
}

const WORKING_DAYS = workingDaysInMay2026();

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pickWorkingDays(from: number, to: number): Date[] {
  return WORKING_DAYS.filter((d) => {
    const day = d.getDate();
    return day >= from && day <= to;
  });
}

// ────────────────────────────────────────────────
// Sample Data Definitions
// ────────────────────────────────────────────────

const USERS = [
  {
    id: randomUUID(),
    email: 'manager@summary.com',
    password: 'Password123',
    fullName: 'Nguyễn Văn An',
    role: 'manager',
  },
  {
    id: randomUUID(),
    email: 'binh.tran@summary.com',
    password: 'Password123',
    fullName: 'Trần Thị Bình',
    role: 'employee',
  },
  {
    id: randomUUID(),
    email: 'cuong.le@summary.com',
    password: 'Password123',
    fullName: 'Lê Hoàng Cường',
    role: 'employee',
  },
  {
    id: randomUUID(),
    email: 'duc.pham@summary.com',
    password: 'Password123',
    fullName: 'Phạm Minh Đức',
    role: 'employee',
  },
  {
    id: randomUUID(),
    email: 'ha.hoang@summary.com',
    password: 'Password123',
    fullName: 'Hoàng Thu Hà',
    role: 'employee',
  },
];

const PROJECTS = [
  {
    id: randomUUID(),
    name: 'Summary Timesheet App',
    description: 'Ứng dụng quản lý chấm công và báo cáo công việc',
    status: 'active',
  },
  {
    id: randomUUID(),
    name: 'Customer Portal',
    description: 'Cổng thông tin khách hàng — tra cứu và phản hồi',
    status: 'active',
  },
  {
    id: randomUUID(),
    name: 'Mobile App v2',
    description: 'Phiên bản 2 ứng dụng di động — redesign UI/UX',
    status: 'active',
  },
  {
    id: randomUUID(),
    name: 'Data Analytics Platform',
    description: 'Nền tảng phân tích dữ liệu nội bộ với dashboard',
    status: 'active',
  },
];

// Sprint definitions: project index → sprints
// May 2026 working days: 1(Fri), 4-8(Mon-Fri), 11-15, 18-22, 25-29
const SPRINTS_CONFIG: {
  projectIdx: number;
  name: string;
  description: string;
  dayFrom: number;
  dayTo: number;
  status: string;
}[] = [
  // Project 0 — Summary Timesheet App: 3 sprints
  { projectIdx: 0, name: 'Sprint 1 — Foundation', description: 'Thiết lập kiến trúc, auth module, database schema', dayFrom: 1, dayTo: 8, status: 'completed' },
  { projectIdx: 0, name: 'Sprint 2 — Core Features', description: 'Work log CRUD, calendar view, employee list', dayFrom: 11, dayTo: 15, status: 'completed' },
  { projectIdx: 0, name: 'Sprint 3 — Polish & Deploy', description: 'Báo cáo, xuất Excel, notification, deploy staging', dayFrom: 18, dayTo: 22, status: 'completed' },

  // Project 1 — Customer Portal: 2 sprints
  { projectIdx: 1, name: 'Sprint 1 — Setup & Auth', description: 'Thiết lập project, tích hợp SSO, CRUD khách hàng', dayFrom: 4, dayTo: 8, status: 'completed' },
  { projectIdx: 1, name: 'Sprint 2 — Feedback Module', description: 'Module phản hồi, gửi email, dashboard thống kê', dayFrom: 11, dayTo: 15, status: 'completed' },

  // Project 2 — Mobile App v2: 3 sprints
  { projectIdx: 2, name: 'Sprint 1 — UI Redesign', description: 'Thiết kế lại giao diện chính, navigation, theme', dayFrom: 4, dayTo: 8, status: 'completed' },
  { projectIdx: 2, name: 'Sprint 2 — API Integration', description: 'Tích hợp API backend, offline mode, push noti', dayFrom: 11, dayTo: 15, status: 'completed' },
  { projectIdx: 2, name: 'Sprint 3 — Testing & Release', description: 'Test E2E, fix bugs, chuẩn bị release lên store', dayFrom: 18, dayTo: 22, status: 'completed' },

  // Project 3 — Data Analytics: 2 sprints
  { projectIdx: 3, name: 'Sprint 1 — Data Pipeline', description: 'ETL pipeline, data warehouse schema, ingestion', dayFrom: 4, dayTo: 8, status: 'completed' },
  { projectIdx: 3, name: 'Sprint 2 — Dashboard', description: 'Dashboard chart, filter, export, real-time metrics', dayFrom: 11, dayTo: 15, status: 'completed' },
];

// Work log templates per work type
const WORK_TEMPLATES: { type: string; contents: string[] }[] = [
  {
    type: 'code',
    contents: [
      'Triển khai tính năng {feature} — viết unit test và tích hợp CI',
      'Refactor module {module} — tối ưu query, giảm N+1',
      'Implement API endpoint {endpoint} — validation, error handling',
      'Code review PR #{pr} — sửa comments, update docs',
    ],
  },
  {
    type: 'bug_fix',
    contents: [
      'Fix bug #{ticket}: {bug_desc} — root cause và regression test',
      'Hotfix production: {bug_desc} — deploy patch v{ver}',
      'Investigate bug #{ticket}: repro steps, log analysis',
    ],
  },
  {
    type: 'research',
    contents: [
      'Nghiên cứu {topic} — đánh giá và đề xuất giải pháp',
      'Spike: {topic} — prototype POC, benchmark performance',
      'Đọc tài liệu {topic} — tóm tắt và chia sẻ team',
    ],
  },
  {
    type: 'meeting',
    contents: [
      'Daily standup — cập nhật tiến độ, raise blockers',
      'Sprint planning — phân tích requirements, estimate story points',
      'Meeting với khách hàng — thu thập feedback, clarify requirements',
      'Retrospective — tổng kết sprint, đề xuất cải thiện',
    ],
  },
  {
    type: 'review',
    contents: [
      'Review PR #{pr} của {colleague} — feedback kiến trúc và code style',
      'Review thiết kế UI/UX mockup — góp ý UX pattern',
    ],
  },
];

// Contextual fill values
const FEATURES = [
  'đăng nhập SSO', 'xuất báo cáo Excel', 'calendar view',
  'notification real-time', 'filter nâng cao', 'pagination cursor',
  'search全文', 'role-based access', 'soft delete cascade', 'audit log',
];
const MODULES = ['auth', 'user', 'work-log', 'project', 'sprint', 'notification', 'report'];
const ENDPOINTS = ['POST /work-logs', 'GET /reports/monthly', 'PUT /projects/:id', 'PATCH /sprints/:id/status'];
const BUG_DESCS = ['lỗi duplicate work log', 'pagination sai offset', 'JWT expired không redirect', 'timezone sai UTC+7', 'data race concurrent write'];
const TOPICS = ['Event Sourcing pattern', 'CQRS với Drizzle ORM', 'PostgreSQL window functions', 'Redis caching strategy', 'Websocket vs SSE'];
const COLLEAGUES = ['Bình', 'Cường', 'Đức', 'Hà', 'An'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ────────────────────────────────────────────────
// Main Seed
// ────────────────────────────────────────────────

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu mẫu — Tháng 5/2026\n');

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Xoá dữ liệu cũ theo thứ tự FK ──
    console.log('🗑  Xoá dữ liệu cũ...');
    await client.query("DELETE FROM work_logs WHERE 1=1");
    await client.query("DELETE FROM sprints WHERE 1=1");
    await client.query("DELETE FROM projects WHERE 1=1");
    await client.query("DELETE FROM users WHERE email IN (" +
      USERS.map((u) => `'${u.email}'`).join(', ') + ")");

    // ── 2. Insert Users ──
    console.log('👤 Tạo users...');
    const employeeIds: string[] = [];
    for (const u of USERS) {
      const hashedPw = await bcrypt.hash(u.password, SALT_ROUNDS);
      await client.query(
        `INSERT INTO users (id, email, password, full_name, role, is_active, version, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, 0, false, NOW(), NOW())`,
        [u.id, u.email, hashedPw, u.fullName, u.role],
      );
      if (u.role === 'employee') employeeIds.push(u.id);
      console.log(`   ✅ ${u.fullName} (${u.role}) — ${u.email}`);
    }

    // ── 3. Insert Projects ──
    console.log('\n📁 Tạo projects...');
    for (const p of PROJECTS) {
      await client.query(
        `INSERT INTO projects (id, name, description, status, version, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, false, NOW(), NOW())`,
        [p.id, p.name, p.description, p.status],
      );
      console.log(`   ✅ ${p.name}`);
    }

    // ── 4. Insert Sprints ──
    console.log('\n🏃 Tạo sprints...');
    const sprintRecords: { id: string; projectIdx: number; days: Date[] }[] = [];

    for (let i = 0; i < SPRINTS_CONFIG.length; i++) {
      const cfg = SPRINTS_CONFIG[i];
      const sprintId = randomUUID();
      const days = pickWorkingDays(cfg.dayFrom, cfg.dayTo);

      const startDate = days[0] || new Date(2026, 4, cfg.dayFrom);
      const endDate = days[days.length - 1] || new Date(2026, 4, cfg.dayTo);

      await client.query(
        `INSERT INTO sprints (id, project_id, name, description, status, start_date, end_date, sort_order, version, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, false, NOW(), NOW())`,
        [
          sprintId,
          PROJECTS[cfg.projectIdx].id,
          cfg.name,
          cfg.description,
          cfg.status,
          startDate,
          endDate,
          i,
        ],
      );

      sprintRecords.push({ id: sprintId, projectIdx: cfg.projectIdx, days });
      console.log(`   ✅ ${cfg.name} (${PROJECTS[cfg.projectIdx].name}) — ${fmt(startDate)} → ${fmt(endDate)} (${days.length} working days)`);
    }

    // ── 5. Insert Work Logs ──
    console.log('\n📝 Tạo work logs...');

    // Mỗi employee tham gia 3-4 projects (random assignment)
    const employeeProjectMap: Record<string, number[]> = {};
    for (const empId of employeeIds) {
      // Mỗi employee tham gia ngẫu nhiên 3-4 projects
      const shuffled = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
      employeeProjectMap[empId] = shuffled.slice(0, count);
    }

    let totalWorkLogs = 0;

    for (const empId of employeeIds) {
      const empUser = USERS.find((u) => u.id === empId)!;
      const projectIndexes = employeeProjectMap[empId];
      let empWorkLogs = 0;

      for (const projIdx of projectIndexes) {
        // Tìm sprints thuộc project này
        const projectSprints = sprintRecords.filter((s) => s.projectIdx === projIdx);

        for (const sprint of projectSprints) {
          // Mỗi sprint: 3-4 work logs
          const logCount = 3 + Math.floor(Math.random() * 2); // 3 or 4
          const logDays = sprint.days
            .sort(() => Math.random() - 0.5)
            .slice(0, logCount);

          for (let j = 0; j < logDays.length; j++) {
            const template = pickRandom(WORK_TEMPLATES);
            const content = pickRandom(template.contents)
              .replace('{feature}', pickRandom(FEATURES))
              .replace('{module}', pickRandom(MODULES))
              .replace('{endpoint}', pickRandom(ENDPOINTS))
              .replace('{pr}', String(100 + Math.floor(Math.random() * 200)))
              .replace('{ticket}', String(50 + Math.floor(Math.random() * 100)))
              .replace('{bug_desc}', pickRandom(BUG_DESCS))
              .replace('{ver}', `${1 + Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`)
              .replace('{topic}', pickRandom(TOPICS))
              .replace('{colleague}', pickRandom(COLLEAGUES));

            const workLogId = randomUUID();
            const executionDate = logDays[j];

            await client.query(
              `INSERT INTO work_logs
                 (id, project_id, employee_id, sprint_id, execution_date, content, work_type, status, is_unlocked, version, is_deleted, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 0, false, NOW(), NOW())`,
              [
                workLogId,
                PROJECTS[projIdx].id,
                empId,
                sprint.id,
                executionDate,
                content,
                template.type,
                Math.random() > 0.2 ? 'done' : 'in_progress', // 80% done, 20% in_progress
              ],
            );

            empWorkLogs++;
            totalWorkLogs++;
          }
        }
      }

      console.log(`   ✅ ${empUser.fullName}: ${empWorkLogs} work logs qua ${projectIndexes.length} projects`);
    }

    // ── Commit ──
    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(55));
    console.log('🎉 SEED THÀNH CÔNG!');
    console.log('═'.repeat(55));
    console.log(`👤 Users:       ${USERS.length} (${USERS.filter(u => u.role === 'employee').length} employees + 1 manager)`);
    console.log(`📁 Projects:    ${PROJECTS.length}`);
    console.log(`🏃 Sprints:     ${SPRINTS_CONFIG.length}`);
    console.log(`📝 Work Logs:   ${totalWorkLogs}`);
    console.log(`📅 Period:      May 2026 (01/05 → 31/05)`);
    console.log('─'.repeat(55));
    console.log('\n🔑 Tài khoản đăng nhập (password: Password123):');
    for (const u of USERS) {
      console.log(`   ${u.role.padEnd(8)} | ${u.email.padEnd(28)} | ${u.fullName}`);
    }
    console.log('');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed thất bại:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
