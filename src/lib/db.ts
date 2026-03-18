import postgres from "postgres";

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS case_notes (
      id BIGSERIAL PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_case_notes_case_id_created_at ON case_notes(case_id, created_at DESC);`;

  schemaReady = true;
}

export function db() {
  return getSql();
}
