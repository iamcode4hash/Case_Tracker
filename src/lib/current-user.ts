import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, isAuthCookieValid } from "@/lib/auth";
import { getSessionUser, type CurrentUser } from "@/lib/sessions";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const appPassword = process.env.APP_PASSWORD;
  if (appPassword) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (isAuthCookieValid(cookieValue, appPassword)) {
      return { id: 0, username: "owner", role: "OWNER", authType: "password" };
    }
  }

  const user = await getSessionUser();
  if (!user) return null;
  return { ...user, authType: "session" };
}

