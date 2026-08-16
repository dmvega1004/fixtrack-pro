import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function CotizacionesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role === "TECHNICIAN") {
    redirect("/");
  }

  return <>{children}</>;
}
