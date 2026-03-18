import { randomBytes } from "crypto";

import { db, ensureSchema } from "@/lib/db";

export type CaseStatus = "OPEN" | "PENDING" | "RESOLVED";

export type CaseCategory = "GENERAL" | "BILLING" | "TECHNICAL" | "ACCOUNT" | "OTHER";
export type CasePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type CaseRow = {
  case_id: string;
  member_name: string | null;
  member_contact: string | null;
  subject: string;
  status: CaseStatus;
  category: CaseCategory;
  priority: CasePriority;
  created_at: string;
  updated_at: string;
};

export type CaseNoteRow = {
  id: number;
  case_id: string;
  note: string;
  created_at: string;
};

function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export function generateCaseId(now = new Date()) {
  const datePart = formatDateYYYYMMDD(now);
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `CS-${datePart}-${suffix}`;
}

export async function createCase(input: {
  memberName?: string;
  memberContact?: string;
  subject: string;
  note: string;
  category?: CaseCategory;
  priority?: CasePriority;
}) {
  await ensureSchema();
  const sql = db();
  const category = input.category ?? "GENERAL";
  const priority = input.priority ?? "NORMAL";

  for (let attempt = 0; attempt < 5; attempt++) {
    const caseId = generateCaseId();

    const inserted = await sql<CaseRow[]>`
      INSERT INTO cases (case_id, member_name, member_contact, subject, status, category, priority)
      VALUES (${caseId}, ${input.memberName ?? null}, ${input.memberContact ?? null}, ${input.subject}, 'OPEN', ${category}, ${priority})
      ON CONFLICT (case_id) DO NOTHING
      RETURNING case_id, member_name, member_contact, subject, status, category, priority, created_at, updated_at;
    `;

    const row = inserted[0];
    if (!row) continue;

    await sql`
      INSERT INTO case_notes (case_id, note)
      VALUES (${caseId}, ${input.note});
    `;

    return row;
  }

  throw new Error("Could not generate a unique case id");
}

export async function getCaseById(caseId: string): Promise<CaseRow | null> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseRow[]>`
    SELECT case_id, member_name, member_contact, subject, status, category, priority, created_at, updated_at
    FROM cases
    WHERE case_id = ${caseId};
  `;

  return rows[0] ?? null;
}

export async function listRecentCases(limit = 20): Promise<CaseRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseRow[]>`
    SELECT case_id, member_name, member_contact, subject, status, category, priority, created_at, updated_at
    FROM cases
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  return rows;
}

function addParam(params: Array<string | number>, value: string | number) {
  params.push(value);
  return `$${params.length}`;
}

export async function listCases(input: {
  limit?: number;
  q?: string;
  status?: CaseStatus | "ALL";
  category?: CaseCategory | "ALL";
  priority?: CasePriority | "ALL";
}): Promise<CaseRow[]> {
  await ensureSchema();
  const sql = db();

  const limit = input.limit ?? 50;
  const q = input.q?.trim();
  const status = input.status ?? "ALL";
  const category = input.category ?? "ALL";
  const priority = input.priority ?? "ALL";

  const params: Array<string | number> = [];
  const where: string[] = [];

  if (q) {
    const p = addParam(params, `%${q}%`);
    where.push(
      `(case_id ILIKE ${p} OR subject ILIKE ${p} OR COALESCE(member_name,'') ILIKE ${p} OR COALESCE(member_contact,'') ILIKE ${p})`,
    );
  }
  if (status !== "ALL") {
    const p = addParam(params, status);
    where.push(`status = ${p}`);
  }
  if (category !== "ALL") {
    const p = addParam(params, category);
    where.push(`category = ${p}`);
  }
  if (priority !== "ALL") {
    const p = addParam(params, priority);
    where.push(`priority = ${p}`);
  }

  const limitParam = addParam(params, limit);

  const query = `
    SELECT case_id, member_name, member_contact, subject, status, category, priority, created_at, updated_at
    FROM cases
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
    LIMIT ${limitParam};
  `;

  const rows = (await sql.unsafe(query, params)) as unknown as CaseRow[];
  return rows;
}

export async function listNotes(caseId: string): Promise<CaseNoteRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseNoteRow[]>`
    SELECT id, case_id, note, created_at
    FROM case_notes
    WHERE case_id = ${caseId}
    ORDER BY created_at DESC;
  `;

  return rows;
}

export async function addNote(caseId: string, note: string) {
  await ensureSchema();
  const sql = db();

  await sql`
    INSERT INTO case_notes (case_id, note)
    VALUES (${caseId}, ${note});
  `;

  await sql`
    UPDATE cases
    SET updated_at = NOW()
    WHERE case_id = ${caseId};
  `;
}

export async function updateStatus(caseId: string, status: CaseStatus) {
  await ensureSchema();
  const sql = db();

  await sql`
    UPDATE cases
    SET status = ${status}, updated_at = NOW()
    WHERE case_id = ${caseId};
  `;
}

export async function updateCaseMeta(input: {
  caseId: string;
  status: CaseStatus;
  category: CaseCategory;
  priority: CasePriority;
}) {
  await ensureSchema();
  const sql = db();

  await sql`
    UPDATE cases
    SET status = ${input.status}, category = ${input.category}, priority = ${input.priority}, updated_at = NOW()
    WHERE case_id = ${input.caseId};
  `;
}
