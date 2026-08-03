import { getSession } from "@/lib/session";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TechnicianDashboard } from "@/components/dashboard/technician-dashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "TECHNICIAN") {
    return <TechnicianDashboard session={session} />;
  }

  return <AdminDashboard session={session} />;
}
