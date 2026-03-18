"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  addNote,
  createCase,
  updateCaseMeta,
  updateStatus,
  type CaseCategory,
  type CasePriority,
  type CaseStatus,
} from "@/lib/cases";
import { AUTH_COOKIE_NAME, authCookieValue, passwordsMatch } from "@/lib/auth";

function parseCategory(input: string): CaseCategory {
  const v = input.trim().toUpperCase();
  if (v === "GENERAL" || v === "BILLING" || v === "TECHNICAL" || v === "ACCOUNT" || v === "OTHER") {
    return v;
  }
  return "GENERAL";
}

function parsePriority(input: string): CasePriority {
  const v = input.trim().toUpperCase();
  if (v === "LOW" || v === "NORMAL" || v === "HIGH" || v === "URGENT") {
    return v;
  }
  return "NORMAL";
}

export async function createCaseAction(formData: FormData) {
  const memberName = String(formData.get("memberName") ?? "").trim();
  const memberContact = String(formData.get("memberContact") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const category = parseCategory(String(formData.get("category") ?? ""));
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
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!caseId) {
    throw new Error("caseId is required");
  }
  if (!note) return;

  await addNote(caseId, note);
  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function updateStatusAction(formData: FormData) {
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

  await updateStatus(caseId, status as CaseStatus);
  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
}

export async function updateCaseMetaAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "")
    .trim()
    .toUpperCase();
  const status = String(formData.get("status") ?? "").trim().toUpperCase();
  const category = parseCategory(String(formData.get("category") ?? ""));
  const priority = parsePriority(String(formData.get("priority") ?? ""));

  if (!caseId) {
    throw new Error("caseId is required");
  }
  if (status !== "OPEN" && status !== "PENDING" && status !== "RESOLVED") {
    throw new Error("Invalid status");
  }

  await updateCaseMeta({
    caseId,
    status: status as CaseStatus,
    category,
    priority,
  });

  revalidatePath(`/case/${caseId}`);
  redirect(`/case/${encodeURIComponent(caseId)}`);
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
  redirect("/unlock");
}
