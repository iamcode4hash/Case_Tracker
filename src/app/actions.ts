"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  addNote,
  bulkUpdateCases,
  createCase,
  getCaseById,
  setStarred,
  updateCaseMeta,
  updateStatus,
  type CasePriority,
  type CaseStatus,
} from "@/lib/cases";
import { AUTH_COOKIE_NAME, authCookieValue, passwordsMatch } from "@/lib/auth";
import {
  createCategory,
  deleteCategory,
  resolveActiveCategorySlug,
  resolveAnyCategorySlug,
  setCategoryActive,
  updateCategory,
} from "@/lib/categories";
import { getCurrentUser } from "@/lib/current-user";
import { verifyPassword } from "@/lib/passwords";
import {
  clearSessionCookie,
  createSession,
  deleteSessionsForUser,
  type UserRole,
} from "@/lib/sessions";
import {
  countActiveOwners,
  createUser,
  deleteUser,
  findUserByUsername,
  getUserById,
  resetPassword,
  setActive,
  updateUsername,
} from "@/lib/users";

async function parseCategorySlug(input: string, opts?: { includeInactive?: boolean }) {
  return opts?.includeInactive ? resolveAnyCategorySlug(input) : resolveActiveCategorySlug(input);
}

function parsePriority(input: string): CasePriority {
  const v = input.trim().toUpperCase();
  if (v === "LOW" || v === "NORMAL" || v === "HIGH" || v === "URGENT") {
    return v;
  }
  return "NORMAL";
}

async function requireWriteAccess() {
  const current = await getCurrentUser();
  if (!current) redirect(process.env.APP_PASSWORD ? "/unlock" : "/login");
  if (current.role === "VIEWER") redirect("/");
  return current;
}

export async function createCaseAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const memberName = String(formData.get("memberName") ?? "").trim();
  const memberContact = String(formData.get("memberContact") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const category = await parseCategorySlug(String(formData.get("category") ?? ""));
  const priority = parsePriority(String(formData.get("priority") ?? ""));

  if (!subject) {
    throw new Error("Subject is required");
  }
  if (!note) {
    throw new Error("Note is required");
  }

  const row = await createCase({
    memberName: memberName || undefined,
    memberContact: memberContact || undefined,
    subject,
    note,
    category,
    priority,
    actor: currentUser.username,
  });

  revalidatePath("/");
  redirect(`/case/${encodeURIComponent(row.case_id)}?created=1`);
}

export async function goToCaseAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  if (!caseId || caseId === "UNDEFINED") return;
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function addNoteAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!caseId) {
    throw new Error("caseId is required");
  }
  if (!note) return;

  await addNote(caseId, note, currentUser.username);
  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function updateStatusAction(formData: FormData) {
  await requireWriteAccess();
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const status = String(formData.get("status") ?? "").trim().toUpperCase();

  if (!caseId) {
    throw new Error("caseId is required");
  }

  if (status !== "OPEN" && status !== "PENDING" && status !== "RESOLVED") {
    throw new Error("Invalid status");
  }

  const current = await getCurrentUser();
  const actor = current?.username ?? "unknown";
  const before = await getCaseById(caseId);
  if (before) {
    await updateCaseMeta({
      caseId,
      status: status as CaseStatus,
      category: before.category,
      priority: before.priority,
      actor,
    });
  } else {
    await updateStatus(caseId, status as CaseStatus);
  }
  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function updateCaseMetaAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const status = String(formData.get("status") ?? "").trim().toUpperCase();
  const category = await parseCategorySlug(String(formData.get("category") ?? ""), {
    includeInactive: true,
  });
  const priority = parsePriority(String(formData.get("priority") ?? ""));

  if (!caseId) {
    throw new Error("caseId is required");
  }
  if (status !== "OPEN" && status !== "PENDING" && status !== "RESOLVED") {
    throw new Error("Invalid status");
  }

  const actor = currentUser.username;

  await updateCaseMeta({
    caseId,
    status: status as CaseStatus,
    category,
    priority,
    actor,
  });

  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function toggleStarAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const next = String(formData.get("starred") ?? "").trim();
  const starred = next === "1";

  if (!caseId) {
    redirect("/");
  }

  const actor = currentUser.username;

  await setStarred({ caseId, starred, actor });
  revalidatePath("/");
  redirect("/");
}

export async function quickStatusAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const status = String(formData.get("status") ?? "").trim().toUpperCase();

  if (!caseId) {
    redirect("/");
  }
  if (status !== "OPEN" && status !== "PENDING" && status !== "RESOLVED") {
    redirect("/");
  }

  const actor = currentUser.username;
  const before = await getCaseById(caseId);
  if (!before) redirect("/");

  await updateCaseMeta({
    caseId,
    status: status as CaseStatus,
    category: before.category,
    priority: before.priority,
    actor,
  });

  revalidatePath("/");
  redirect("/");
}

export async function bulkUpdateAction(formData: FormData) {
  const currentUser = await requireWriteAccess();
  const ids = formData
    .getAll("caseIds")
    .map((v) => String(v).trim().toUpperCase())
    .filter(Boolean);

  if (!ids.length) {
    redirect("/");
  }

  const statusRaw = String(formData.get("bulkStatus") ?? "").trim().toUpperCase();
  const categoryRaw = String(formData.get("bulkCategory") ?? "").trim();
  const priorityRaw = String(formData.get("bulkPriority") ?? "").trim();

  const status =
    statusRaw === "OPEN" || statusRaw === "PENDING" || statusRaw === "RESOLVED"
      ? (statusRaw as CaseStatus)
      : undefined;
  const category = categoryRaw ? await parseCategorySlug(categoryRaw) : undefined;
  const priority = priorityRaw ? parsePriority(priorityRaw) : undefined;

  const actor = currentUser.username;

  await bulkUpdateCases({
    caseIds: ids,
    actor,
    status,
    category,
    priority,
  });

  revalidatePath("/");
  redirect("/");
}

export async function createCategoryAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const label = String(formData.get("label") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : undefined;

  try {
    await createCategory({ label, slug: slug || undefined, sortOrder });
  } catch {
    redirect("/admin/categories?error=1");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const id = Number(formData.get("id") ?? 0);
  if (!id) redirect("/admin/categories?error=1");

  const label = String(formData.get("label") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : undefined;

  try {
    await updateCategory({
      id,
      label: label || undefined,
      slug: slug || undefined,
      sortOrder,
    });
  } catch {
    redirect("/admin/categories?error=1");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function toggleCategoryActiveAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const id = Number(formData.get("id") ?? 0);
  const next = String(formData.get("isActive") ?? "").trim();
  const isActive = next === "1";
  if (!id) redirect("/admin/categories?error=1");

  await setCategoryActive({ id, isActive });
  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const id = Number(formData.get("id") ?? 0);
  if (!id) redirect("/admin/categories?error=1");

  try {
    await deleteCategory({ id });
  } catch {
    redirect("/admin/categories?error=1");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function unlockAction(formData: FormData) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    redirect("/");
  }

  const providedPassword = String(formData.get("password") ?? "");
  if (!providedPassword) {
    redirect("/unlock?error=1");
  }

  if (!passwordsMatch(providedPassword, appPassword)) {
    redirect("/unlock?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, authCookieValue(appPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  await clearSessionCookie();
  redirect(process.env.APP_PASSWORD ? "/unlock" : "/login");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/login?error=1");
  }

  const user = await findUserByUsername(username);
  if (!user || !user.is_active) {
    redirect("/login?error=1");
  }

  if (!verifyPassword(password, user.password_hash)) {
    redirect("/login?error=1");
  }

  await createSession(user.id, 60 * 60 * 24 * 30);
  redirect("/");
}

function parseRole(input: string): UserRole {
  const v = input.trim().toUpperCase();
  if (v === "OWNER" || v === "CSM" || v === "AGENT" || v === "VIEWER") return v;
  return "AGENT";
}

export async function createUserAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = parseRole(String(formData.get("role") ?? ""));

  if (!username.trim() || password.length < 6) {
    redirect("/admin/users?error=1");
  }

  await createUser({ username, password, role });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function renameUserAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const userId = Number(formData.get("userId") ?? 0);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!userId || !username) {
    redirect("/admin/users?error=1");
  }

  await updateUsername({ userId, username });
  await deleteSessionsForUser(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const userId = Number(formData.get("userId") ?? 0);
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 6) {
    redirect("/admin/users?error=1");
  }

  await resetPassword({ userId, password });
  await deleteSessionsForUser(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const userId = Number(formData.get("userId") ?? 0);
  const next = String(formData.get("isActive") ?? "").trim();
  const isActive = next === "1";
  if (!userId) {
    redirect("/admin/users?error=1");
  }

  const user = await getUserById(userId);
  if (!user) {
    redirect("/admin/users?error=1");
  }

  if (!isActive && user.role === "OWNER") {
    const owners = await countActiveOwners();
    if (owners <= 1) {
      redirect("/admin/users?error=1");
    }
  }

  await setActive({ userId, isActive });
  if (!isActive) {
    await deleteSessionsForUser(userId);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    redirect("/");
  }

  const userId = Number(formData.get("userId") ?? 0);
  if (!userId) {
    redirect("/admin/users?error=1");
  }

  if (current.authType === "session" && current.id === userId) {
    redirect("/admin/users?error=1");
  }

  const user = await getUserById(userId);
  if (!user) {
    redirect("/admin/users?error=1");
  }

  if (user.role === "OWNER") {
    const owners = await countActiveOwners();
    if (owners <= 1) {
      redirect("/admin/users?error=1");
    }
  }

  await deleteSessionsForUser(userId);
  await deleteUser(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
