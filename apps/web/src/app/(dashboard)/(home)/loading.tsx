import { getSession } from "@/lib/session";
import { Skeleton as Bone } from "@/components/ui/skeleton";

function AdminSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-28" />
          <Bone className="h-8 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Bone className="h-24" />
        <Bone className="h-24" />
        <Bone className="h-24" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Bone className="h-56" />
        <Bone className="h-56" />
        <Bone className="h-48" />
        <Bone className="h-48" />
      </div>
    </div>
  );
}

function TechnicianSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-32" />
      </div>

      <Bone className="h-32 w-full rounded-xl" />

      <div className="flex items-center justify-between">
        <Bone className="h-5 w-24" />
        <Bone className="h-4 w-32" />
      </div>

      <div className="flex flex-col gap-3">
        <Bone className="h-20" />
        <Bone className="h-20" />
        <Bone className="h-20" />
      </div>
    </div>
  );
}

/**
 * Se muestra mientras la home hace sus fetches en paralelo (Next envuelve
 * page.tsx en un Suspense automático por este archivo). getSession() solo
 * decodifica la cookie local — no pega al backend — así que elegir el
 * esqueleto correcto por rol acá sigue siendo instantáneo.
 */
export default async function DashboardLoading() {
  const session = await getSession();

  if (session?.role === "TECHNICIAN") {
    return <TechnicianSkeleton />;
  }

  return <AdminSkeleton />;
}
