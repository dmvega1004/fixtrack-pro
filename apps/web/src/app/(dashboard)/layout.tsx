import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/api/auth";
import { AppShell } from "@/components/shared/app-shell";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { SyncEngineRegister } from "@/components/shared/sync-engine-register";
import { QueueEngineRegister } from "@/components/shared/queue-engine-register";
import { ShellCacheRefresh } from "@/components/shared/shell-cache-refresh";
import {
  OtherUsersQueueNotice,
  QueueStatusIndicator,
} from "@/components/queue/queue-status-indicator";
import { QueuePanel } from "@/components/queue/queue-panel";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Chequeo EN VIVO contra el backend (GET /auth/me), no el del JWT
  // firmado: mustChangePassword puede cambiar sin que se emita un token
  // nuevo (ej. un ADMIN restablece la contraseña de este usuario mientras
  // su sesión sigue abierta) — el claim del JWT quedaría desactualizado.
  // Corre en TODA ruta del dashboard: no hay forma de esquivarlo
  // navegando directo a una URL interna.
  const currentUser = await getCurrentUser();
  if (currentUser.mustChangePassword) {
    redirect("/cambiar-contrasena");
  }

  // Huella del armazón sin señal (W5, ver ShellCacheRefresh): usuario +
  // commit publicado. Sin commit (local) no hay huella y se precachea en
  // cada carga, como antes.
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  const shellFingerprint = commit ? `${session.userId}:${commit}` : null;

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <SyncEngineRegister userId={session.userId} />
      <QueueEngineRegister userId={session.userId} />
      <ShellCacheRefresh fingerprint={shellFingerprint} />
      <OfflineBanner />
      <QueueStatusIndicator variant="strip" />
      <OtherUsersQueueNotice />
      <QueuePanel userId={session.userId} />
      <AppShell session={session}>{children}</AppShell>
    </div>
  );
}
