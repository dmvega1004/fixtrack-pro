import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { OfflineBanner } from "@/components/shared/offline-banner";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <OfflineBanner />
      <AppShell session={session}>{children}</AppShell>
    </div>
  );
}
