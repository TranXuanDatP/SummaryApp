/**
 * Custom migration runner — applies SQL files from ./drizzle folder.
 * Tracks applied migrations in drizzle.__drizzle_migrations (same table drizzle-kit uses).
 *
 * Usage:
 *   node scripts/migrate.js          # apply pending migrations
 *   node scripts/migrate.js --status  # show migration status
 *   node scripts/migrate.js --reset   # drop all tables + re-apply from scratch
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/nestjs_project';
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'drizzle');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');
const TRACKING_SCHEMA = 'drizzle';
const TRACKING_TABLE = `${TRACKING_SCHEMA}.__drizzle_migrations`;

async function getClient() {
  const client = new Client(DB_URL);
  await client.connect();
  return client;
}

async function ensureTrackingTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${TRACKING_SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(64) NOT NULL UNIQUE,
      created_at BIGINT NOT NULL
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(`SELECT hash FROM ${TRACKING_TABLE}`);
  return new Set(rows.map(r => r.hash));
}

function loadJournal() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    console.error('No migration journal found. Run `npm run db:generate` first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
}

function hashContent(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function applyMigration(client, tag, sqlContent) {
  const hash = hashContent(sqlContent);
  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`  Applying ${tag} (${statements.length} statements)...`);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (err) {
      throw new Error(`Failed in ${tag}: ${err.message}\n  SQL: ${stmt.substring(0, 100)}...`);
    }
  }

  await client.query(
    `INSERT INTO ${TRACKING_TABLE} (hash, created_at) VALUES ($1, $2)`,
    [hash, Date.now()]
  );
  console.log(`  ✅ ${tag}`);
}

async function migrate() {
  const client = await getClient();
  try {
    await ensureTrackingTable(client);
    const applied = await getApplied(client);
    const journal = loadJournal();

    let pending = 0;
    for (const entry of journal.entries) {
      const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        console.error(`  ❌ ${entry.tag}.sql not found`);
        continue;
      }
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const hash = hashContent(sqlContent);

      if (!applied.has(hash)) {
        await applyMigration(client, entry.tag, sqlContent);
        pending++;
      }
    }

    if (pending === 0) {
      console.log('No pending migrations. Database is up to date.');
    } else {
      console.log(`\n✅ ${pending} migration(s) applied successfully.`);
    }
  } finally {
    await client.end();
  }
}

async function status() {
  const client = await getClient();
  try {
    await ensureTrackingTable(client);
    const applied = await getApplied(client);
    const journal = loadJournal();

    console.log('Migration Status:\n');
    for (const entry of journal.entries) {
      const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const hash = hashContent(sqlContent);
      const isApplied = applied.has(hash);
      console.log(`  ${isApplied ? '✅' : '⏳'} ${entry.tag}`);
    }
    console.log(`\n  Applied: ${applied.size} / ${journal.entries.length}`);
  } finally {
    await client.end();
  }
}

async function reset() {
  const client = await getClient();
  try {
    console.log('Dropping all tables, types, and schemas...');
    await client.query(`DROP SCHEMA IF EXISTS ${TRACKING_SCHEMA} CASCADE`);
    // Drop all public tables
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    for (const row of rows) {
      await client.query(`DROP TABLE IF EXISTS public."${row.tablename}" CASCADE`);
    }
    // Drop all public enum types
    const { rows: types } = await client.query(`
      SELECT typname FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `);
    for (const row of types) {
      await client.query(`DROP TYPE IF EXISTS public."${row.typname}" CASCADE`);
    }
    console.log('  ✅ Dropped all\n');
    await migrate();
  } finally {
    await client.end();
  }
}

// Main
const cmd = process.argv[2];
if (cmd === '--status') {
  status().catch(e => { console.error('❌', e.message); process.exit(1); });
} else if (cmd === '--reset') {
  reset().catch(e => { console.error('❌', e.message); process.exit(1); });
} else {
  migrate().catch(e => { console.error('❌', e.message); process.exit(1); });
}
