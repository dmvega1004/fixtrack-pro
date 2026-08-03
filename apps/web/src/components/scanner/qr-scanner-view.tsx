"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  Loader2,
  ShieldAlert,
  CircleCheck,
  SearchX,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isUuid } from "@/lib/is-uuid";
import { useQrScanner } from "@/components/scanner/use-qr-scanner";
import { useMediaDevicesSupported } from "@/components/scanner/use-media-devices-supported";
import { resolveQrCodeAction } from "@/app/(dashboard)/escanear/actions";

type ScanState =
  | "idle"
  | "requesting-permission"
  | "scanning"
  | "resolving"
  | "success"
  | "error-permission"
  | "error-camera"
  | "error-not-found";

// El único momento "de espera" real es entre pedir permiso y recibir el
// stream — no hay un "cargando cámara" aparte que vigilar: stream en mano
// pasa directo a escanear.
const CAMERA_STATES: ScanState[] = ["requesting-permission", "scanning"];

const IS_DEV = process.env.NODE_ENV !== "production";
const DIAGNOSTIC_LOG_SIZE = 5;

export function QrScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resolvingRef = useRef(false);
  const stopCameraRef = useRef<() => void>(() => {});
  const sessionStartRef = useRef(0);

  const [state, setState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ brand: string; model: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);

  const cameraActive = CAMERA_STATES.includes(state);

  // Solo diagnóstico en desarrollo — sin devtools en el celular, esta es la
  // única telemetría disponible si el flujo vuelve a trabarse en algún
  // dispositivo real. Corre durante toda la sesión de cámara (no se reinicia
  // al pasar de "requesting-permission" a "scanning").
  useEffect(() => {
    if (!IS_DEV || !cameraActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
      setElapsedSeconds(0);
    };
  }, [cameraActive]);

  const appendLog = useCallback((message: string) => {
    if (!IS_DEV) return;
    const elapsedMs = Date.now() - sessionStartRef.current;
    setDiagnosticLog((prev) => [...prev.slice(-(DIAGNOSTIC_LOG_SIZE - 1)), `+${elapsedMs}ms ${message}`]);
  }, []);

  const handleDetect = useCallback(
    (rawValue: string) => {
      const code = rawValue.trim();
      if (!isUuid(code) || resolvingRef.current) return;

      resolvingRef.current = true;
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(80);
      }
      stopCameraRef.current();
      setState("resolving");

      void resolveQrCodeAction(code).then((result) => {
        if (!result.ok || !result.equipmentId) {
          resolvingRef.current = false;
          setErrorMessage(
            result.message ?? "Este código no corresponde a ningún equipo de tu empresa",
          );
          setState("error-not-found");
          return;
        }

        setSuccessInfo({ brand: result.brand ?? "", model: result.model ?? "" });
        setState("success");
        toast.success(`Equipo identificado: ${result.brand} ${result.model}`);
        router.push(`/equipos/${result.equipmentId}`);
      });
    },
    [router],
  );

  const { startCamera, stopCamera } = useQrScanner({
    videoRef,
    onDetect: handleDetect,
    onLog: appendLog,
    // Única señal que importa: stream en mano = a escanear. El guard
    // funcional evita pisar un estado distinto si, por ejemplo, el usuario
    // ya canceló mientras el permiso todavía estaba pendiente.
    onStreamAcquired: () => {
      appendLog("setState escaneando");
      setState((current) => (current === "requesting-permission" ? "scanning" : current));
    },
  });
  useEffect(() => {
    stopCameraRef.current = stopCamera;
  }, [stopCamera]);

  // getUserMedia exige un contexto seguro (HTTPS o localhost). Si el celular
  // entra por http://<ip-local>:puerto, navigator.mediaDevices no existe.
  const mediaDevicesSupported = useMediaDevicesSupported();

  useEffect(() => {
    if (state !== "requesting-permission") return;

    let cancelled = false;
    void startCamera().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setErrorMessage(result.message);
        setState(result.reason === "permission" ? "error-permission" : "error-camera");
      }
      // Éxito: el estado ya pasó a "scanning" vía onStreamAcquired en cuanto
      // llegó el stream — no hay nada más que hacer acá.
    });

    return () => {
      cancelled = true;
    };
  }, [state, startCamera]);

  // Libera la cámara también al desmontar el componente (navegar fuera de /escanear).
  useEffect(() => {
    return () => stopCameraRef.current();
  }, []);

  function handleStart() {
    resolvingRef.current = false;
    setErrorMessage(null);
    sessionStartRef.current = Date.now();
    setDiagnosticLog([]);
    setState("requesting-permission");
  }

  function handleCancel() {
    stopCameraRef.current();
    setState("idle");
  }

  if (!mediaDevicesSupported) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <VideoOff className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Cámara no disponible</h1>
            <p className="text-sm text-muted-foreground">
              Este navegador no permite acceder a la cámara desde esta dirección
              porque no es un contexto seguro (HTTPS o localhost). Es lo esperado
              al entrar desde el celular al servidor de desarrollo por IP local
              (http://).
            </p>
            <p className="text-xs text-muted-foreground">
              Pide que habiliten HTTPS en el servidor de desarrollo, o activa el
              flag chrome://flags/#unsafely-treat-insecure-origin-as-secure en el
              Chrome del celular para este origen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cameraActive) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 size-full object-cover"
        />

        {state === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-64 max-w-[70vw] overflow-hidden rounded-2xl">
              <div className="absolute inset-0 rounded-2xl border-2 border-white/70" />
              <div className="absolute inset-x-2 h-0.5 animate-[scan-line_2s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 text-center text-white">
          {state === "requesting-permission" && (
            <>
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm">Solicitando permiso de cámara…</p>
            </>
          )}
          {state === "scanning" && (
            <p className="absolute bottom-10 text-sm text-white/80">
              Apunta al código QR del equipo
            </p>
          )}
        </div>

        {IS_DEV && (
          <div className="absolute bottom-4 left-4 z-10 max-w-[75vw] rounded-lg bg-black/60 p-2 font-mono text-[10px] leading-tight text-white/70">
            <p>{elapsedSeconds}s desde &quot;Iniciar escaneo&quot; (solo dev)</p>
            {diagnosticLog.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          className="absolute top-4 right-4 z-10 bg-black/40 text-white hover:bg-black/60"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      {state === "idle" && (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Camera className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold">Escanear código QR</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Apunta la cámara al código QR pegado en el equipo para abrir su ficha
            al instante.
          </p>
          <Button onClick={handleStart}>Iniciar escaneo</Button>
        </>
      )}

      {state === "resolving" && (
        <>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verificando código…</p>
        </>
      )}

      {state === "success" && successInfo && (
        <>
          <CircleCheck className="size-12 text-primary" />
          <h1 className="text-xl font-semibold">
            {successInfo.brand} {successInfo.model}
          </h1>
          <p className="text-sm text-muted-foreground">Abriendo ficha del equipo…</p>
        </>
      )}

      {state === "error-permission" && (
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="size-10 text-destructive" />
            <h1 className="text-lg font-semibold">Permiso de cámara denegado</h1>
            <p className="text-sm text-muted-foreground">
              Para escanear necesitamos acceso a la cámara. Habilítalo desde los
              ajustes del navegador y vuelve a intentar:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-left text-xs text-muted-foreground">
              <li>
                Chrome (Android): toca el candado junto a la dirección → Permisos
                → Cámara → Permitir, luego recarga la página.
              </li>
              <li>
                Safari (iPhone): Ajustes del iPhone → Safari → Cámara → Permitir,
                luego recarga la página.
              </li>
            </ul>
            <Button onClick={handleStart}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {state === "error-camera" && (
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <VideoOff className="size-10 text-destructive" />
            <h1 className="text-lg font-semibold">No se pudo abrir la cámara</h1>
            <p className="text-sm text-muted-foreground">
              {errorMessage ?? "Ocurrió un problema al acceder a la cámara."}
            </p>
            <Button onClick={handleStart}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {state === "error-not-found" && (
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <SearchX className="size-10 text-destructive" />
            <h1 className="text-lg font-semibold">Equipo no encontrado</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button onClick={handleStart}>Escanear de nuevo</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
