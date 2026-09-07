"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSyncState } from "@/hooks/use-sync-state";
import { getSnapshot as getConnectivitySnapshot } from "@/lib/connectivity/store";
import { runSync } from "@/lib/sync/engine";
import { runQueuePass } from "@/lib/queue/engine";
import { formatTime } from "@/lib/format/dates";

/** Hay que soltar pasado esto para que dispare — un arrastre corto no cuenta. */
const TRIGGER_DISTANCE_PX = 70;
/** Tope visual del indicador, con resistencia (ver ARM_DISTANCE_PX/resistencia en el touchmove). */
const MAX_PULL_PX = 110;
/** Umbral mínimo antes de considerar esto un gesto real — evita que un temblor o un tap dispare el indicador. */
const ARM_DISTANCE_PX = 8;
/** Tiempo que se deja leído el aviso de "sin conexión" antes de recoger el indicador. */
const OFFLINE_MESSAGE_MS = 1100;

type Phase = "idle" | "pulling" | "refreshing" | "offline";

interface PullToRefreshProps {
  userId: string;
  children: ReactNode;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nunca arranca el gesto dentro de un elemento con su propio scroll que
 * no esté arriba del todo (ej. la lista de un ComboSelect abierto) ni
 * dentro de uno que capture el toque a propósito (signature-pad.tsx, ver
 * touchAction: none) — se camina desde `target` hasta (sin incluir)
 * `boundary` buscando cualquiera de los dos casos.
 */
function isExcludedTarget(target: EventTarget | null, boundary: Element): boolean {
  if (!(target instanceof Element)) return false;

  let node: Element | null = target;
  while (node && node !== boundary) {
    const style = window.getComputedStyle(node);

    if (style.touchAction === "none") return true;

    const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    if (canScrollY && node.scrollTop > 0) return true;

    node = node.parentElement;
  }
  return false;
}

/**
 * Deslizar hacia abajo arriba del todo, en cualquier pantalla del panel —
 * implementado UNA sola vez acá (ver app-shell.tsx, que envuelve `children`
 * con esto) para no depender de que cada pantalla nueva se acuerde de
 * ponerlo. Solo en móvil: en escritorio ni siquiera se instalan los
 * listeners de touch.
 *
 * "Refrescar" son dos cosas a la vez: volver a pedir los datos de la
 * pantalla actual (router.refresh(), con señal) y forzar una
 * sincronización del conjunto de trabajo saltándose el intervalo mínimo
 * de 5 minutos (runSync con force) — más, de paso, intentar subir lo que
 * haya en la cola (runQueuePass): un gesto explícito del técnico es
 * justo la oportunidad de aprovechar.
 *
 * Sin conectividad OBSERVADA (lib/connectivity/store — nunca
 * navigator.onLine), el gesto ni intenta la red: sería una espera
 * condenada. Termina rápido diciendo desde cuándo son los datos que se
 * están viendo (mismo texto que OfflineBanner, para que sea reconocible).
 */
export function PullToRefresh({ userId, children }: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { lastSyncedAt } = useSyncState();

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  /** identifier del toque que arrancó ESTE gesto — para ignorar cualquier otro dedo que toque de paso mientras tanto. */
  const touchIdRef = useRef<number | null>(null);
  /** true = este toque ya calificó para el gesto (arrancó arriba del todo, fuera de zonas excluidas). */
  const armedRef = useRef(false);
  /** true = ya hubo algún movimiento hacia abajo real en este toque (para no disparar en un simple tap). */
  const draggingRef = useRef(false);
  const pullPxRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");

  const [pullPx, setPullPx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  function updatePull(px: number): void {
    pullPxRef.current = px;
    setPullPx(px);
  }

  function updatePhase(next: Phase): void {
    phaseRef.current = next;
    setPhase(next);
  }

  async function triggerRefresh(): Promise<void> {
    updatePhase("refreshing");
    updatePull(TRIGGER_DISTANCE_PX);

    if (getConnectivitySnapshot()) {
      updatePhase("offline");
      await sleep(OFFLINE_MESSAGE_MS);
      updatePhase("idle");
      updatePull(0);
      return;
    }

    try {
      router.refresh();
      await Promise.allSettled([runSync(userId, { force: true }), runQueuePass(userId)]);
    } finally {
      updatePhase("idle");
      updatePull(0);
    }
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isMobile) return;

    // Eventos de TOQUE, no de puntero — a propósito, y no por costumbre.
    // Se probó en un celular real que con Pointer Events el navegador
    // reconoce el gesto como scroll nativo y dispara pointercancel ANTES
    // de que el código alcance a acumular ARM_DISTANCE_PX y llamar a
    // preventDefault() — los eventos dejan de llegar y el gesto nunca se
    // arma. Con touchmove registrado NO pasivo, el navegador espera a ver
    // si el handler llama a preventDefault() antes de comprometerse al
    // scroll nativo — por eso acá se llama DESDE EL PRIMER píxel hacia
    // abajo (no recién pasado ARM_DISTANCE_PX, que sigue existiendo pero
    // solo para decidir cuándo mostrar el indicador, nunca para decidir
    // cuándo capturar el gesto).
    function findTrackedTouch(touches: TouchList): Touch | null {
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === touchIdRef.current) return touches[i];
      }
      return null;
    }

    function handleTouchStart(event: TouchEvent): void {
      if (phaseRef.current !== "idle") return;
      if (touchIdRef.current !== null) return; // ya hay un dedo llevando este gesto
      const touch = event.changedTouches[0];
      if (!touch) return;

      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;
      if (isExcludedTarget(event.target, el!)) return;

      touchIdRef.current = touch.identifier;
      startYRef.current = touch.clientY;
      armedRef.current = true;
    }

    function handleTouchMove(event: TouchEvent): void {
      if (!armedRef.current || startYRef.current === null) return;
      const touch = findTrackedTouch(event.touches);
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;

      if (deltaY === 0) return; // sin movimiento todavía (sampling) — sigue armado, nada que decidir aún

      if (deltaY < 0) {
        // El dedo se movió hacia arriba de verdad — esto no es un pull,
        // se suelta el gesto para el resto de este toque y no se
        // interfiere con el desplazamiento normal.
        armedRef.current = false;
        draggingRef.current = false;
        updatePull(0);
        return;
      }

      // Captura el gesto YA — ver el porqué en el comentario de arriba.
      event.preventDefault();
      draggingRef.current = true;

      if (deltaY < ARM_DISTANCE_PX) return; // ya capturado, todavía sin mostrar nada (evita jitter visual)

      updatePull(Math.min(MAX_PULL_PX, deltaY * 0.5));
      updatePhase("pulling");
    }

    function handleTouchEnd(event: TouchEvent): void {
      let ourTouchEnded = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === touchIdRef.current) {
          ourTouchEnded = true;
          break;
        }
      }
      if (!ourTouchEnded) return; // otro dedo distinto soltó, el nuestro sigue activo
      touchIdRef.current = null;
      armedRef.current = false;
      if (!draggingRef.current) return;
      draggingRef.current = false;

      if (pullPxRef.current >= TRIGGER_DISTANCE_PX) {
        void triggerRefresh();
      } else {
        updatePull(0);
        updatePhase("idle");
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el resto del estado que la función usa vive en refs, a propósito (ver arriba): re-instalar los listeners en cada pull perdería el gesto a mitad de camino.
  }, [isMobile, userId]);

  const offlineMessage = lastSyncedAt
    ? `Sin conexión · datos de las ${formatTime(lastSyncedAt)}`
    : "Sin conexión — algunas acciones no funcionarán hasta que vuelva la señal";

  return (
    <div ref={containerRef}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pullPx,
          transition: phase === "pulling" ? undefined : "height 200ms ease-out",
        }}
        aria-hidden={phase === "idle"}
      >
        {phase === "offline" ? (
          <span className="px-4 text-center text-xs font-medium text-amber-900">
            {offlineMessage}
          </span>
        ) : (
          <RefreshCw
            className={cn(
              "size-5 text-muted-foreground",
              phase === "refreshing" && "animate-spin",
            )}
            style={
              phase === "pulling"
                ? { transform: `rotate(${(pullPx / TRIGGER_DISTANCE_PX) * 180}deg)` }
                : undefined
            }
            aria-hidden="true"
          />
        )}
      </div>
      {children}
    </div>
  );
}
