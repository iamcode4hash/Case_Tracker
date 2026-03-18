import { randomBytes } from "crypto";

import { cookies } from "next/headers";

import { db, ensureSchema } from "@/lib/db";

export const SESSION_COOKIE_NAME = "ct_session";

export type UserRole = "OWNER" | "CSM" | "AGENT" | "VIEWER";

export type CurrentUser = {
  id: number;
  username: string;
  role: UserRole;
  authType: "session" | "password";
};

export async function createSession(userId: number, maxAgeSeconds: number) {
  await ensureSchema();
  const sql = db();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

  await sql`
    INSERT INTO app_sessions (user_id, session_token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt});
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser() {
  await ensureSchema();
  const sql = db();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await sql<
    Array<{ id: number; username: string; role: UserRole; expires_at: string; is_active: boolean }>
  >`
    SELECT u.id, u.username, u.role, s.expires_at, u.is_active
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.session_token = ${token}
    LIMIT 1;
  `;

  const row = rows[0];
  if (!row) return null;
  if (!row.is_active) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;

  return { id: row.id, username: row.username, role: row.role } satisfies Omit<
    CurrentUser,
    "authType"
  >;
}

export async function deleteSessionsForUser(userId: number) {
  await ensureSchema();
  const sql = db();
  await sql`
    DELETE FROM app_sessions
    WHERE user_id = ${userId};
  `;
}
