"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogout } from "@/hooks/use-logout";
import { getQueueStats, type QueueStats } from "@/lib/queue/storage";
import { openQueuePanel } from "@/components/queue/queue-panel-store";

interface LogoutButtonProps {
  /** Con userId, antes de salir se revisa la cola de cambios pendientes de ese usuario. */
  userId?: string;
  /**
   * Solo donde existe el panel de la cola (dashboard): muestra «Ver
   * cambios». `onShowQueue` deja que quien lo contiene se cierre antes
   * (el menú móvil de app-shell.tsx).
   */
  canShowQueue?: boolean;
  onShowQueue?: () => void;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("#", String(count));
}

/**
 * Cerrar sesión con cambios pendientes ADVIERTE pero no bloquea: los
 * cambios no se pierden al salir (cada operación lleva su userId y se
 * sube cuando ese usuario vuelva a entrar en este celular), así que
 * bloquear no protegería nada y podría dejar atrapado a un técnico.
 */
export function LogoutButton({ userId, canShowQueue = false, onShowQueue }: LogoutButtonProps) {
  const { logout, isLoading } = useLogout();
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<QueueStats | null>(null);

  async function handleClick() {
    if (!userId) {
      void logout();
      return;
    }
    setChecking(true);
    // Se lee IndexedDB directo, no el contador en pantalla: este botón
    // también vive fuera del dashboard (/cambiar-contrasena), donde el
    // motor de la cola no corre y ese contador no existe.
    const stats = await getQueueStats(userId).catch(() => null);
    setChecking(false);
    if (stats && stats.pending + stats.parked > 0) {
      setPending(stats);
      return;
    }
    void logout();
  }

  function handleShowQueue() {
    setPending(null);
    onShowQueue?.();
    openQueuePanel();
  }

  function handleLogoutAnyway() {
    setPending(null);
    void logout();
  }

  const total = pending ? pending.pending + pending.parked : 0;

  return (
    <>
      <Button variant="outline" onClick={() => void handleClick()} disabled={isLoading || checking}>
        {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
      </Button>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {plural(total, "Tienes 1 cambio sin subir", "Tienes # cambios sin subir")}
            </DialogTitle>
            <DialogDescription>
              Si sales, quedan guardados en este celular y solo se suben cuando
              vuelvas a entrar con tu usuario aquí mismo.
            </DialogDescription>
          </DialogHeader>

          {pending && pending.parked > 0 && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold">
                  {plural(pending.parked, "1 cambio está detenido", "# cambios están detenidos")}
                </span>
                {pending.parked === 1
                  ? " porque el servidor no lo aceptó. No se va a subir solo: necesita que alguien lo revise."
                  : " porque el servidor no los aceptó. No se van a subir solos: necesitan que alguien los revise."}
              </p>
            </div>
          )}

          {/* DialogFooter es flex-col-reverse en celular: el ÚLTIMO botón
              queda arriba. Lo seguro (revisar / quedarse) va al final; salir,
              primero — que nunca sea lo que se toca sin leer. */}
          <DialogFooter>
            <Button variant="destructive" onClick={handleLogoutAnyway}>
              Salir igual
            </Button>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            {canShowQueue && <Button onClick={handleShowQueue}>Ver cambios</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
