import { randomBytes } from "crypto";

import { db, ensureSchema } from "@/lib/db";

export type CaseStatus = "OPEN" | "PENDING" | "RESOLVED";

export type CaseRow = {
  case_id: string;
  member_name: string | null;
  member_contact: string | null;
  subject: string;
  status: CaseStatus;
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
}) {
  await ensureSchema();
  const sql = db();

  for (let attempt = 0; attempt < 5; attempt++) {
    const caseId = generateCaseId();

    const inserted = (await sql`
      INSERT INTO cases (case_id, member_name, member_contact, subject, status)
      VALUES (${caseId}, ${input.memberName ?? null}, ${input.memberContact ?? null}, ${input.subject}, 'OPEN')
      ON CONFLICT (case_id) DO NOTHING
      RETURNING case_id, member_name, member_contact, subject, status, created_at, updated_at;
    `) as unknown as CaseRow[];

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

  const rows = (await sql`
    SELECT case_id, member_name, member_contact, subject, status, created_at, updated_at
    FROM cases
    WHERE case_id = ${caseId};
  `) as unknown as CaseRow[];

  return rows[0] ?? null;
}

export async function listRecentCases(limit = 20): Promise<CaseRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = (await sql`
    SELECT case_id, member_name, member_contact, subject, status, created_at, updated_at
    FROM cases
    ORDER BY created_at DESC
    LIMIT ${limit};
  `) as unknown as CaseRow[];

  return rows;
}

export async function listNotes(caseId: string): Promise<CaseNoteRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = (await sql`
    SELECT id, case_id, note, created_at
    FROM case_notes
    WHERE case_id = ${caseId}
    ORDER BY created_at DESC;
  `) as unknown as CaseNoteRow[];

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
