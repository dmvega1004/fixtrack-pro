import { getSession, ROLE_LABELS } from "@/lib/session";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Perfil</h1>
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{session.email}</span>
        <span className="text-muted-foreground">{ROLE_LABELS[session.role]}</span>
      </div>
      <LogoutButton />
    </div>
  );
}
