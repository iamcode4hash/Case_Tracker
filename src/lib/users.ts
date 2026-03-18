import { db, ensureSchema } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import type { UserRole } from "@/lib/sessions";

export type AppUserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export async function findUserByUsername(username: string) {
  await ensureSchema();
  const sql = db();

  const rows = await sql<AppUserRow[]>`
    SELECT id, username, password_hash, role, is_active, created_at
    FROM app_users
    WHERE username = ${username}
    LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function listUsers() {
  await ensureSchema();
  const sql = db();

  const rows = await sql<Omit<AppUserRow, "password_hash">[]>`
    SELECT id, username, role, is_active, created_at
    FROM app_users
    ORDER BY created_at DESC;
  `;

  return rows;
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
}) {
  await ensureSchema();
  const sql = db();

  const username = input.username.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);

  const rows = await sql<Array<{ id: number }>>`
    INSERT INTO app_users (username, password_hash, role)
    VALUES (${username}, ${passwordHash}, ${input.role})
    RETURNING id;
  `;

  return rows[0]?.id ?? null;
}

