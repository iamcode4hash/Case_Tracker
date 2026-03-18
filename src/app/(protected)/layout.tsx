import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, isAuthCookieValid } from "@/lib/auth";

export default async function ProtectedLayout(props: { children: React.ReactNode }) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return props.children;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!isAuthCookieValid(cookieValue, appPassword)) {
    redirect("/unlock");
  }

  return props.children;
}
