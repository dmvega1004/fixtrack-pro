"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getConnectivityDiagnostics, type ConnectivityDiagnostics } from "@/lib/connectivity/store";
import { getQueueEngineDiagnostics } from "@/lib/queue/engine";
import { getSnapshot as getQueueSnapshot } from "@/lib/queue/state-store";
import { getSyncEngineDiagnostics, type SyncEngineDiagnostics } from "@/lib/sync/engine";

/**
 * Diagnóstico de conexión y del armazón sin señal (/perfil/diagnostico).
 *
 * Existe porque el APK de release no se puede inspeccionar con
 * chrome://inspect, y habilitar esa depuración en release se descartó a
 * propósito: cualquiera con el celular y un cable podría inspeccionar la
 * sesión del técnico. Esta página muestra lo mismo que hace falta mirar
 * —service worker, caché del armazón, navigator.onLine y los eventos de
 * red— sin salir de la app.
 *
 * SOLO LECTURA y SIN DATOS SENSIBLES: nada de correo, nombres ni
 * contenido de órdenes o de la cola (solo conteos). Las entradas de la
 * caché se muestran como rutas, sin cadena de consulta.
 *
 * Se refresca sola cada segundo: la idea es abrirla con señal, activar el
 * modo avión con la página abierta y ver qué cambia (y qué no) en vivo.
 */

const REFRESH_MS = 1_000;
const MAX_EVENTS = 40;

interface RegistrationInfo {
  scope: string;
  active: string | null;
  waiting: string | null;
  installing: string | null;
  /** Carga anticipada de navegación (sw.js la apaga dentro del APK). */
  preload: string;
}

interface CacheInfo {
  name: string;
  /** Pantallas y demás rutas, una por una. */
  paths: string[];
  /** Archivos de /_next/static: solo el número, son decenas y no dicen nada por nombre. */
  staticCount: number;
}

interface Sample {
  at: number;
  navigatorOnLine: boolean;
  visibility: DocumentVisibilityState;
  connectivity: ConnectivityDiagnostics;
  queue: { pending: number; parked: number; uploading: boolean; passStartedAt: number | null };
  sync: SyncEngineDiagnostics;
  swSupported: boolean;
  controller: { scriptURL: string; state: string } | null;
  registrations: RegistrationInfo[] | null;
  caches: CacheInfo[] | null;
  /** Registro de la huella del armazón (W5, sw.js) — sin el id de usuario. */
  shellMeta: { commit: string; cacheName: string; at: number } | null;
  errors: string[];
}

interface LoggedEvent {
  at: number;
  text: string;
}

function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin ? parsed.pathname : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function preloadState(reg: ServiceWorkerRegistration): Promise<string> {
  if (!reg.navigationPreload) return "sin soporte";
  try {
    const state = await reg.navigationPreload.getState();
    return state.enabled ? "ACTIVA" : "apagada";
  } catch (error) {
    return `error: ${errorText(error)}`;
  }
}

async function takeSample(): Promise<Sample> {
  const errors: string[] = [];
  const swSupported = "serviceWorker" in navigator;

  let controller: Sample["controller"] = null;
  let registrations: Sample["registrations"] = null;
  if (swSupported) {
    const current = navigator.serviceWorker.controller;
    controller = current ? { scriptURL: pathOf(current.scriptURL), state: current.state } : null;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      registrations = await Promise.all(
        regs.map(async (reg) => ({
          scope: pathOf(reg.scope),
          preload: await preloadState(reg),
          active: reg.active ? `${pathOf(reg.active.scriptURL)} (${reg.active.state})` : null,
          waiting: reg.waiting ? `${pathOf(reg.waiting.scriptURL)} (${reg.waiting.state})` : null,
          installing: reg.installing ? `${pathOf(reg.installing.scriptURL)} (${reg.installing.state})` : null,
        })),
      );
    } catch (error) {
      errors.push(`getRegistrations: ${errorText(error)}`);
    }
  }

  let cacheInfo: Sample["caches"] = null;
  if (typeof caches !== "undefined") {
    try {
      const names = await caches.keys();
      cacheInfo = await Promise.all(
        names.map(async (name) => {
          const requests = await (await caches.open(name)).keys();
          const all = requests.map((request) => pathOf(request.url));
          const paths = all.filter((path) => !path.startsWith("/_next/static/")).sort();
          return { name, paths, staticCount: all.length - paths.length };
        }),
      );
    } catch (error) {
      errors.push(`caches: ${errorText(error)}`);
    }
  }

  let shellMeta: Sample["shellMeta"] = null;
  if (typeof caches !== "undefined") {
    try {
      const stored = await (await caches.open("fixtrack-meta")).match("/__fixtrack-meta/armazon");
      if (stored) {
        const record = (await stored.json()) as { fingerprint: string; cacheName: string; at: number };
        // Solo el commit (lo que va después de «:»): el id de usuario no se muestra.
        const commit = record.fingerprint.split(":").pop() ?? "";
        shellMeta = { commit: commit.slice(0, 7), cacheName: record.cacheName, at: record.at };
      }
    } catch (error) {
      errors.push(`fixtrack-meta: ${errorText(error)}`);
    }
  }

  const queue = getQueueSnapshot();

  return {
    at: Date.now(),
    navigatorOnLine: navigator.onLine,
    visibility: document.visibilityState,
    connectivity: getConnectivityDiagnostics(),
    queue: {
      pending: queue.pendingCount,
      parked: queue.parkedCount,
      uploading: queue.isUploading,
      passStartedAt: getQueueEngineDiagnostics().passStartedAt,
    },
    sync: getSyncEngineDiagnostics(),
    swSupported,
    controller,
    registrations,
    caches: cacheInfo,
    shellMeta,
    errors,
  };
}

function formatTime(ms: number | null): string {
  if (ms === null) return "nunca";
  return new Date(ms).toLocaleTimeString("es-CO", { hour12: false });
}

function ago(ms: number | null, now: number): string {
  if (ms === null) return "nunca";
  return `${formatTime(ms)} (hace ${Math.max(0, Math.round((now - ms) / 1000))} s)`;
}

/** «en curso desde HH:MM:SS (hace N s)» o «no», para ver un cuelgue sin cable. */
function inFlight(since: number | null, now: number): string {
  return since === null ? "no" : `SÍ, desde ${ago(since, now)}`;
}

function lastSyncText(last: SyncEngineDiagnostics["last"], now: number): string {
  if (!last) return "ninguna desde que se abrió la app";
  return `${last.result} (${last.trigger}), tardó ${(last.durationMs / 1000).toFixed(1)} s, terminó ${ago(last.finishedAt, now)}`;
}

function lastSkippedText(skipped: SyncEngineDiagnostics["lastSkipped"], now: number): string {
  if (!skipped) return "ninguna";
  return `${skipped.reason} (${skipped.trigger}), ${ago(skipped.at, now)}`;
}

function syncInFlightText(sync: SyncEngineDiagnostics, now: number): string {
  const text = inFlight(sync.inFlightSince, now);
  return sync.inFlightTrigger ? `${text} (${sync.inFlightTrigger})` : text;
}

function windowText(until: number | null, now: number): string {
  if (until === null) return "libre";
  return `bloqueada hasta ${formatTime(until)} (faltan ${Math.ceil((until - now) / 1000)} s)`;
}

function shellMetaText(meta: Sample["shellMeta"], now: number): string {
  if (!meta) return "sin registro (se precachea en la próxima carga)";
  return `${ago(meta.at, now)} · commit ${meta.commit} · ${meta.cacheName}`;
}

function yesNo(value: boolean): string {
  return value ? "sí" : "no";
}

/** Texto plano para copiar y mandar — mismo contenido que la pantalla. */
function buildReport(sample: Sample, events: LoggedEvent[], environment: Environment): string {
  const lines = [
    `Diagnóstico FixTrack — ${new Date(sample.at).toISOString()}`,
    `Dentro del APK: ${yesNo(environment.native)} · ${environment.userAgent}`,
    `navigator.onLine: ${sample.navigatorOnLine}`,
    `La app cree: ${sample.connectivity.isOffline ? "SIN señal" : "con señal"} · fallos seguidos ${sample.connectivity.consecutiveFailures}`,
    `Última confirmación: ${ago(sample.connectivity.lastSuccessAt, sample.at)}`,
    `Último fallo: ${ago(sample.connectivity.lastFailureAt, sample.at)}`,
    `Latido activo: ${yesNo(sample.connectivity.heartbeatRunning)}`,
    `Cola: ${sample.queue.pending} por subir, ${sample.queue.parked} detenidas`,
    `Pasada de la cola en curso: ${inFlight(sample.queue.passStartedAt, sample.at)}`,
    `Sincronización en curso: ${syncInFlightText(sample.sync, sample.at)}`,
    `Última sincronización: ${lastSyncText(sample.sync.last, sample.at)}`,
    `Última descartada: ${lastSkippedText(sample.sync.lastSkipped, sample.at)}`,
    `Ventana de 5 min: ${windowText(sample.sync.windowUntil, sample.at)}`,
    `Último precacheo completo del armazón: ${shellMetaText(sample.shellMeta, sample.at)}`,
    `Service worker soportado: ${yesNo(sample.swSupported)}`,
    `Controla esta página: ${sample.controller ? `${sample.controller.scriptURL} (${sample.controller.state})` : "NO"}`,
    ...(sample.registrations ?? []).map(
      (reg) =>
        `Registro ${reg.scope}: activo=${reg.active ?? "-"} esperando=${reg.waiting ?? "-"} instalando=${reg.installing ?? "-"} carga anticipada=${reg.preload}`,
    ),
    ...(sample.registrations?.length === 0 ? ["Registros: NINGUNO"] : []),
    ...(sample.caches ?? []).map(
      (cache) =>
        `Caché ${cache.name}: ${cache.paths.join(", ") || "(sin pantallas)"} + ${cache.staticCount} archivos /_next/static`,
    ),
    ...(sample.caches?.length === 0 ? ["Cachés: NINGUNA"] : []),
    ...sample.errors.map((error) => `Error: ${error}`),
    "Eventos:",
    ...events.map((event) => `  ${formatTime(event.at)} ${event.text}`),
  ];
  return lines.join("\n");
}

interface Environment {
  native: boolean;
  userAgent: string;
}

export function ConnectionDiagnostics() {
  const [sample, setSample] = useState<Sample | null>(null);
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const reportRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    let previousOnLine: boolean | null = null;
    let previousAppOffline: boolean | null = null;

    const log = (text: string) => {
      setEvents((current) => [{ at: Date.now(), text }, ...current].slice(0, MAX_EVENTS));
    };

    const refresh = async () => {
      const next = await takeSample();
      if (cancelled) return;
      // Cambios que se notan por sondeo aunque el evento nunca llegue —
      // justo lo que hay que distinguir dentro del APK.
      if (previousOnLine !== null && previousOnLine !== next.navigatorOnLine) {
        log(`navigator.onLine cambió a ${next.navigatorOnLine}`);
      }
      if (previousAppOffline !== null && previousAppOffline !== next.connectivity.isOffline) {
        log(`la app pasó a ${next.connectivity.isOffline ? "SIN señal" : "con señal"}`);
      }
      previousOnLine = next.navigatorOnLine;
      previousAppOffline = next.connectivity.isOffline;
      setSample(next);
    };

    const onOnline = () => log("evento «online» recibido");
    const onOffline = () => log("evento «offline» recibido");
    const onVisibility = () => log(`visibilidad: ${document.visibilityState}`);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => void refresh(), REFRESH_MS);
    // Primer muestreo y entorno fuera del cuerpo síncrono del efecto.
    const first = window.setTimeout(() => {
      setEnvironment({ native: Capacitor.isNativePlatform(), userAgent: navigator.userAgent });
      void refresh();
    }, 0);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      window.clearTimeout(first);
    };
  }, []);

  if (!sample || !environment) {
    return <p className="text-sm text-muted-foreground">Leyendo…</p>;
  }

  const report = buildReport(sample, events, environment);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Diagnóstico copiado");
    } catch {
      reportRef.current?.focus();
      reportRef.current?.select();
      toast.info("Texto seleccionado: mantén presionado y elige «Copiar»");
    }
  }

  const shellCache = sample.caches?.find((cache) => cache.name.startsWith("fixtrack-shell-"));

  return (
    <div className="flex flex-col gap-4 text-sm">
      <Section title="Conexión">
        <Row label="Hora" value={formatTime(sample.at)} />
        <Row label="navigator.onLine" value={String(sample.navigatorOnLine)} strong />
        <Row
          label="La app cree"
          value={sample.connectivity.isOffline ? "SIN señal" : "con señal"}
          strong
        />
        <Row label="Fallos seguidos" value={String(sample.connectivity.consecutiveFailures)} />
        <Row label="Última confirmación" value={ago(sample.connectivity.lastSuccessAt, sample.at)} />
        <Row label="Último fallo" value={ago(sample.connectivity.lastFailureAt, sample.at)} />
        <Row label="Latido activo" value={yesNo(sample.connectivity.heartbeatRunning)} />
        <Row label="Pantalla" value={sample.visibility} />
      </Section>

      <Section title="Service worker">
        <Row label="Dentro del APK" value={yesNo(environment.native)} />
        <Row label="Soportado" value={yesNo(sample.swSupported)} />
        <Row
          label="Controla esta página"
          value={sample.controller ? `${sample.controller.scriptURL} (${sample.controller.state})` : "NO"}
          strong
        />
        {sample.registrations?.length === 0 && <Row label="Registros" value="NINGUNO" strong />}
        {sample.registrations?.map((reg) => (
          <div key={reg.scope} className="rounded-md bg-muted/50 p-2 font-mono text-xs">
            <div>alcance {reg.scope}</div>
            <div>activo: {reg.active ?? "—"}</div>
            <div>esperando: {reg.waiting ?? "—"}</div>
            <div>instalando: {reg.installing ?? "—"}</div>
            <div>carga anticipada: {reg.preload}</div>
          </div>
        ))}
      </Section>

      <Section title="Caché del armazón">
        {!shellCache && <Row label="fixtrack-shell-*" value="NO EXISTE" strong />}
        <Row label="Último precacheo completo" value={shellMetaText(sample.shellMeta, sample.at)} />
        {sample.caches?.map((cache) => (
          <div key={cache.name} className="flex flex-col gap-1">
            <span className="font-medium">
              {cache.name} · {cache.paths.length} {cache.paths.length === 1 ? "ruta" : "rutas"} +{" "}
              {cache.staticCount} archivos /_next/static
            </span>
            <ul className="list-disc pl-5 font-mono text-xs break-all">
              {cache.paths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Cola (solo conteos)">
        <Row label="Por subir" value={String(sample.queue.pending)} />
        <Row label="Detenidas" value={String(sample.queue.parked)} />
        <Row label="Subiendo ahora" value={yesNo(sample.queue.uploading)} />
        <Row
          label="Pasada en curso"
          value={inFlight(sample.queue.passStartedAt, sample.at)}
          strong={sample.queue.passStartedAt !== null}
        />
      </Section>

      <Section title="Sincronización">
        <Row
          label="En curso"
          value={syncInFlightText(sample.sync, sample.at)}
          strong={sample.sync.inFlightSince !== null}
        />
        <Row label="Última" value={lastSyncText(sample.sync.last, sample.at)} />
        <Row label="Última descartada" value={lastSkippedText(sample.sync.lastSkipped, sample.at)} />
        <Row label="Ventana de 5 min" value={windowText(sample.sync.windowUntil, sample.at)} />
      </Section>

      <Section title="Eventos (el más reciente arriba)">
        {events.length === 0 ? (
          <p className="text-muted-foreground">
            Ninguno todavía. Activa el modo avión con esta página abierta.
          </p>
        ) : (
          <ul className="font-mono text-xs">
            {events.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                {formatTime(event.at)} {event.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {sample.errors.length > 0 && (
        <Section title="Errores al leer">
          <ul className="font-mono text-xs text-destructive">
            {sample.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={() => void handleCopy()} className="self-start">
          Copiar diagnóstico
        </Button>
        <textarea
          ref={reportRef}
          readOnly
          value={report}
          rows={6}
          aria-label="Diagnóstico en texto"
          className="w-full rounded-lg border border-input bg-transparent p-2 font-mono text-xs"
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-right font-semibold" : "text-right"}>{value}</span>
    </div>
  );
}
