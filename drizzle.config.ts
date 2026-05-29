import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/modules/**/infrastructure/persistence/drizzle/schema/*.ts',
    './src/libs/shared/database/outbox/drizzle/schema/outbox.schema.ts',
    './src/libs/shared/logging/audit/drizzle/schema/audit-log.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Trỏ cứng link 127.0.0.1, tuyệt đối không dùng process.env lúc này
    // Đã sửa port thành 5433 để đồng bộ với docker-compose và .env
    url: 'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project',
  },
});