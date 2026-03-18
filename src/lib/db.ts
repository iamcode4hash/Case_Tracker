import postgres from "postgres";

import { hashPassword } from "@/lib/passwords";

let sqlClient: ReturnType<typeof postgres> | null = null;
let schemaReady = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
    });
  }

  return sqlClient;
}

export async function ensureSchema() {
  if (schemaReady) return;

  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS cases (
      case_id TEXT PRIMARY KEY,
      member_name TEXT,
      member_contact TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      category TEXT NOT NULL DEFAULT 'GENERAL',
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      starred BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'GENERAL';`;
  await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL';`;
  await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS starred BOOLEAN NOT NULL DEFAULT FALSE;`;

  await sql`
    CREATE TABLE IF NOT EXISTS case_notes (
      id BIGSERIAL PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      actor TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS actor TEXT;`;

  await sql`CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cases_status_created_at ON cases(status, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cases_category_created_at ON cases(category, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cases_starred_created_at ON cases(starred DESC, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_case_notes_case_id_created_at ON case_notes(case_id, created_at DESC);`;

  await sql`
    CREATE TABLE IF NOT EXISTS case_categories (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_case_categories_active_sort ON case_categories(is_active DESC, sort_order ASC, label ASC);`;

  await sql`
    INSERT INTO case_categories (slug, label, sort_order)
    VALUES
      ('GENERAL','General',0),
      ('BILLING','Billing',10),
      ('TECHNICAL','Technical',20),
      ('ACCOUNT','Account',30),
      ('OTHER','Other',40)
    ON CONFLICT (slug) DO NOTHING;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'AGENT',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON app_sessions(session_token);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions(expires_at);`;

  await sql`
    CREATE TABLE IF NOT EXISTS case_audits (
      id BIGSERIAL PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      from_category TEXT,
      to_category TEXT,
      from_priority TEXT,
      to_priority TEXT,
      from_starred BOOLEAN,
      to_starred BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_case_audits_case_id_created_at ON case_audits(case_id, created_at DESC);`;

  const initialOwnerPassword = process.env.INITIAL_OWNER_PASSWORD;
  if (initialOwnerPassword) {
    const initialOwnerUsername = (process.env.INITIAL_OWNER_USERNAME ?? "owner").trim();
    const initialOwnerRole = "OWNER";
    const initialOwnerPasswordHash = hashPassword(initialOwnerPassword);
    await sql`
      INSERT INTO app_users (username, password_hash, role)
      VALUES (${initialOwnerUsername}, ${initialOwnerPasswordHash}, ${initialOwnerRole})
      ON CONFLICT (username) DO NOTHING;
    `;
  }

  schemaReady = true;
}

export function db() {
  return getSql();
}
