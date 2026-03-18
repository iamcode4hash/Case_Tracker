import { randomBytes } from "crypto";

import { db, ensureSchema } from "@/lib/db";

export type CaseStatus = "OPEN" | "PENDING" | "RESOLVED";

export type CaseCategory = string;
export type CasePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type CaseRow = {
  case_id: string;
  member_name: string | null;
  member_contact: string | null;
  subject: string;
  status: CaseStatus;
  category: CaseCategory;
  priority: CasePriority;
  starred: boolean;
  last_actor?: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseNoteRow = {
  id: number;
  case_id: string;
  note: string;
  actor: string | null;
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
  category?: string;
  priority?: CasePriority;
  actor?: string;
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
      RETURNING case_id, member_name, member_contact, subject, status, category, priority, starred, created_at, updated_at;
    `;

    const row = inserted[0];
    if (!row) continue;

    await sql`
      INSERT INTO case_notes (case_id, note, actor)
      VALUES (${caseId}, ${input.note}, ${input.actor ?? null});
    `;

    if (input.actor) {
      await insertAudit({
        caseId,
        actor: input.actor,
        action: "CREATE",
        toStatus: "OPEN",
        toCategory: category,
        toPriority: priority,
        toStarred: false,
      });
      await insertAudit({
        caseId,
        actor: input.actor,
        action: "ADD_NOTE",
      });
    }

    return row;
  }

  throw new Error("Could not generate a unique case id");
}

export async function getCaseById(caseId: string): Promise<CaseRow | null> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseRow[]>`
    SELECT case_id, member_name, member_contact, subject, status, category, priority, starred,
      (
        SELECT actor
        FROM case_audits
        WHERE case_audits.case_id = cases.case_id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_actor,
      created_at, updated_at
    FROM cases
    WHERE case_id = ${caseId};
  `;

  return rows[0] ?? null;
}

export async function listRecentCases(limit = 20): Promise<CaseRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseRow[]>`
    SELECT case_id, member_name, member_contact, subject, status, category, priority, starred,
      (
        SELECT actor
        FROM case_audits
        WHERE case_audits.case_id = cases.case_id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_actor,
      created_at, updated_at
    FROM cases
    ORDER BY starred DESC, created_at DESC
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
  category?: string | "ALL";
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
    SELECT case_id, member_name, member_contact, subject, status, category, priority, starred,
      (
        SELECT actor
        FROM case_audits
        WHERE case_audits.case_id = cases.case_id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_actor,
      created_at, updated_at
    FROM cases
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY starred DESC, created_at DESC
    LIMIT ${limitParam};
  `;

  const rows = (await sql.unsafe(query, params)) as unknown as CaseRow[];
  return rows;
}

export async function listNotes(caseId: string): Promise<CaseNoteRow[]> {
  await ensureSchema();
  const sql = db();

  const rows = await sql<CaseNoteRow[]>`
    SELECT id, case_id, note, actor, created_at
    FROM case_notes
    WHERE case_id = ${caseId}
    ORDER BY created_at DESC;
  `;

  return rows;
}

export async function addNote(caseId: string, note: string, actor?: string) {
  await ensureSchema();
  const sql = db();

  await sql`
    INSERT INTO case_notes (case_id, note, actor)
    VALUES (${caseId}, ${note}, ${actor ?? null});
  `;

  await sql`
    UPDATE cases
    SET updated_at = NOW()
    WHERE case_id = ${caseId};
  `;

  if (actor) {
    await insertAudit({
      caseId,
      actor,
      action: "ADD_NOTE",
    });
  }
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

export type CaseAuditRow = {
  id: number;
  case_id: string;
  actor: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  from_category: string | null;
  to_category: string | null;
  from_priority: string | null;
  to_priority: string | null;
  from_starred: boolean | null;
  to_starred: boolean | null;
  created_at: string;
};

async function insertAudit(input: {
  caseId: string;
  actor: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromCategory?: string | null;
  toCategory?: string | null;
  fromPriority?: string | null;
  toPriority?: string | null;
  fromStarred?: boolean | null;
  toStarred?: boolean | null;
}) {
  const sql = db();
  await sql`
    INSERT INTO case_audits (
      case_id, actor, action,
      from_status, to_status,
      from_category, to_category,
      from_priority, to_priority,
      from_starred, to_starred
    )
    VALUES (
      ${input.caseId}, ${input.actor}, ${input.action},
      ${input.fromStatus ?? null}, ${input.toStatus ?? null},
      ${input.fromCategory ?? null}, ${input.toCategory ?? null},
      ${input.fromPriority ?? null}, ${input.toPriority ?? null},
      ${input.fromStarred ?? null}, ${input.toStarred ?? null}
    );
  `;
}

export async function listAudits(caseId: string, limit = 30): Promise<CaseAuditRow[]> {
  await ensureSchema();
  const sql = db();
  const rows = await sql<CaseAuditRow[]>`
    SELECT id, case_id, actor, action,
      from_status, to_status,
      from_category, to_category,
      from_priority, to_priority,
      from_starred, to_starred,
      created_at
    FROM case_audits
    WHERE case_id = ${caseId}
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
  return rows;
}

export async function updateCaseMeta(input: {
  caseId: string;
  status: CaseStatus;
  category: string;
  priority: CasePriority;
  actor?: string;
}) {
  await ensureSchema();
  const sql = db();

  const before = await getCaseById(input.caseId);

  await sql`
    UPDATE cases
    SET status = ${input.status}, category = ${input.category}, priority = ${input.priority}, updated_at = NOW()
    WHERE case_id = ${input.caseId};
  `;

  if (input.actor && before) {
    if (
      before.status === input.status &&
      before.category === input.category &&
      before.priority === input.priority
    ) {
      return;
    }
    await insertAudit({
      caseId: input.caseId,
      actor: input.actor,
      action: "UPDATE_META",
      fromStatus: before.status,
      toStatus: input.status,
      fromCategory: before.category,
      toCategory: input.category,
      fromPriority: before.priority,
      toPriority: input.priority,
    });
  }
}

export async function setStarred(input: { caseId: string; starred: boolean; actor?: string }) {
  await ensureSchema();
  const sql = db();

  const before = await getCaseById(input.caseId);

  await sql`
    UPDATE cases
    SET starred = ${input.starred}, updated_at = NOW()
    WHERE case_id = ${input.caseId};
  `;

  if (input.actor && before) {
    await insertAudit({
      caseId: input.caseId,
      actor: input.actor,
      action: "STAR",
      fromStarred: before.starred,
      toStarred: input.starred,
    });
  }
}

export async function bulkUpdateCases(input: {
  caseIds: string[];
  actor: string;
  status?: CaseStatus;
  category?: string;
  priority?: CasePriority;
}) {
  await ensureSchema();

  const updates: Array<Promise<void>> = [];
  for (const caseId of input.caseIds) {
    const normalized = caseId.trim().toUpperCase();
    if (!normalized) continue;

    updates.push(
      (async () => {
        const before = await getCaseById(normalized);
        if (!before) return;

        const nextStatus = input.status ?? before.status;
        const nextCategory = input.category ?? before.category;
        const nextPriority = input.priority ?? before.priority;

        await updateCaseMeta({
          caseId: normalized,
          status: nextStatus,
          category: nextCategory,
          priority: nextPriority,
          actor: input.actor,
        });
      })(),
    );
  }

  await Promise.all(updates);
}
