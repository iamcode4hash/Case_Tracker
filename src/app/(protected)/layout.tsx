import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";

export default async function ProtectedLayout(props: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(process.env.APP_PASSWORD ? "/unlock" : "/login");
  }

  return props.children;
}
