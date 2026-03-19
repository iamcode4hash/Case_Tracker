import { randomBytes } from "crypto";

import { db, ensureSchema } from "@/lib/db";

export type CaseCategoryRow = {
  id: number;
  slug: string;
  label: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

function normalizeSlug(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

function normalizeLabel(input: string) {
  return input.trim().slice(0, 48);
}

function generateSlug() {
  return `CAT_${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function listCategories(opts?: { includeInactive?: boolean }) {
  await ensureSchema();
  const sql = db();

  const includeInactive = Boolean(opts?.includeInactive);
  const rows = await sql<CaseCategoryRow[]>`
    SELECT id, slug, label, is_system, is_active, sort_order, created_at
    FROM case_categories
    ${includeInactive ? sql`` : sql`WHERE is_active = TRUE`}
    ORDER BY is_active DESC, sort_order ASC, label ASC;
  `;
  return rows;
}

export async function categoryExists(slug: string) {
  await ensureSchema();
  const sql = db();
  const rows = await sql<Array<{ ok: number }>>`
    SELECT 1 AS ok
    FROM case_categories
    WHERE slug = ${slug} AND is_active = TRUE
    LIMIT 1;
  `;
  return Boolean(rows[0]?.ok);
}

export async function categoryExistsAny(slug: string) {
  await ensureSchema();
  const sql = db();
  const rows = await sql<Array<{ ok: number }>>`
    SELECT 1 AS ok
    FROM case_categories
    WHERE slug = ${slug}
    LIMIT 1;
  `;
  return Boolean(rows[0]?.ok);
}

export async function createCategory(input: { label: string; slug?: string; sortOrder?: number }) {
  await ensureSchema();
  const sql = db();

  const label = normalizeLabel(input.label);
  const normalized = normalizeSlug(input.slug ?? label);
  const slug = normalized || generateSlug();
  const sortOrder = input.sortOrder ?? 0;

  if (!label) {
    throw new Error("Invalid category");
  }

  await sql`
    INSERT INTO case_categories (slug, label, sort_order)
    VALUES (${slug}, ${label}, ${sortOrder});
  `;

  return slug;
}

export async function updateCategory(input: { id: number; label?: string; slug?: string; sortOrder?: number }) {
  await ensureSchema();
  const sql = db();

  const label = typeof input.label === "string" ? normalizeLabel(input.label) : undefined;
  const slug = input.slug ? normalizeSlug(input.slug) : undefined;
  const sortOrder = input.sortOrder;

  if (!label && !slug && typeof sortOrder !== "number") {
    throw new Error("No changes");
  }

  const oldRows = await sql<Array<{ slug: string; is_system: boolean }>>`
    SELECT slug, is_system
    FROM case_categories
    WHERE id = ${input.id}
    LIMIT 1;
  `;
  const oldSlug = oldRows[0]?.slug;
  const isSystem = Boolean(oldRows[0]?.is_system);

  if (label) {
    await sql`
      UPDATE case_categories
      SET label = ${label}
      WHERE id = ${input.id};
    `;
  }

  if (typeof sortOrder === "number" && Number.isFinite(sortOrder)) {
    await sql`
      UPDATE case_categories
      SET sort_order = ${sortOrder}
      WHERE id = ${input.id};
    `;
  }

  if (slug) {
    if (isSystem) {
      throw new Error("System category slug cannot be changed");
    }
    if (oldSlug && oldSlug !== slug) {
      await sql`
        UPDATE case_categories
        SET slug = ${slug}
        WHERE id = ${input.id};
      `;
      await sql`
        UPDATE cases
        SET category = ${slug}
        WHERE category = ${oldSlug};
      `;
    }
  }

  if (input.slug && !slug) {
    throw new Error("Invalid slug");
  }
}

export async function setCategoryActive(input: { id: number; isActive: boolean }) {
  await ensureSchema();
  const sql = db();
  await sql`
    UPDATE case_categories
    SET is_active = ${input.isActive}
    WHERE id = ${input.id};
  `;
}

export async function deleteCategory(input: { id: number }) {
  await ensureSchema();
  const sql = db();

  const rows = await sql<Array<{ slug: string; is_system: boolean }>>`
    SELECT slug, is_system
    FROM case_categories
    WHERE id = ${input.id}
    LIMIT 1;
  `;
  const slug = rows[0]?.slug;
  const isSystem = Boolean(rows[0]?.is_system);
  if (!slug) return;
  if (isSystem) {
    throw new Error("System categories cannot be deleted");
  }

  const usedRows = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::text AS count
    FROM cases
    WHERE category = ${slug};
  `;
  const used = Number(usedRows[0]?.count ?? "0");
  if (used > 0) {
    throw new Error("Category is in use");
  }

  await sql`
    DELETE FROM case_categories
    WHERE id = ${input.id};
  `;
}

export async function resolveActiveCategorySlug(input: string | undefined) {
  const slug = normalizeSlug(input ?? "");
  if (!slug) return "GENERAL";
  const ok = await categoryExists(slug);
  return ok ? slug : "GENERAL";
}

export async function resolveAnyCategorySlug(input: string | undefined) {
  const slug = normalizeSlug(input ?? "");
  if (!slug) return "GENERAL";
  const ok = await categoryExistsAny(slug);
  return ok ? slug : "GENERAL";
}
