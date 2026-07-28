import { getSession, ROLE_LABELS } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-1 p-6">
      <h1 className="text-2xl font-semibold">Hola, {session.email}</h1>
      <p className="text-sm text-muted-foreground">
        {ROLE_LABELS[session.role]}
      </p>
    </div>
  );
}
