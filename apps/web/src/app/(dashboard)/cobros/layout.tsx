import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** Cobros es exclusivo de ADMIN — ni Coordinador ni Técnico entran, ver Roles(ADMIN) en el backend. */
export default async function CobrosLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
