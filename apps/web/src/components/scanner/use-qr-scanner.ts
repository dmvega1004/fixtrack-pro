"use client";

import { useCallback, useEffect, useRef } from "react";
import jsQR from "jsqr";

// Frames más grandes hacen que jsQR (fallback, sin aceleración nativa) tarde
// demasiado en gama baja. BarcodeDetector nativo sí procesa el video a full
// resolución porque corre fuera del hilo de JS.
const JSQR_MAX_DIMENSION = 480;

export type CameraStartError =
  | { ok: false; reason: "permission"; message: string }
  | { ok: false; reason: "camera"; message: string };

export type CameraStartResult = { ok: true } | CameraStartError;

interface UseQrScannerParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDetect: (rawValue: string) => void;
  // Se dispara en cuanto getUserMedia devuelve un stream: es la única señal
  // que importa para pasar a "escaneando". No se espera loadedmetadata, ni
  // playing, ni play(), ni dimensiones del video — todo eso puede tardar o,
  // en algunos Android, no llegar nunca, y el stream ya está utilizable.
  onStreamAcquired?: () => void;
  // Diagnóstico opcional (solo lo usa la UI en dev): un hito con mensaje.
  onLog?: (message: string) => void;
}

export function useQrScanner({ videoRef, onDetect, onStreamAcquired, onLog }: UseQrScannerParams) {
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);
  const detectingRef = useRef(false);
  const runningRef = useRef(false);
  const loopRef = useRef<() => void>(() => {});
  const firstFrameLoggedRef = useRef(false);

  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const onStreamAcquiredRef = useRef(onStreamAcquired);
  useEffect(() => {
    onStreamAcquiredRef.current = onStreamAcquired;
  }, [onStreamAcquired]);

  const onLogRef = useRef(onLog);
  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    canvasRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoRef]);

  const detectFrame = useCallback(async () => {
    const video = videoRef.current;
    // Tolera frames todavía sin datos o sin dimensiones: no arrancamos el
    // loop esperando nada del video, así que los primeros ticks pueden
    // encontrarlo así — se reintenta en el siguiente frame, sin más.
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;
    if (!video.videoWidth || !video.videoHeight) return;

    if (!firstFrameLoggedRef.current) {
      firstFrameLoggedRef.current = true;
      onLogRef.current?.(`primer frame con datos ${video.videoWidth}x${video.videoHeight}`);
    }

    if (barcodeDetectorRef.current) {
      try {
        const codes = await barcodeDetectorRef.current.detect(video);
        if (codes.length > 0) onDetectRef.current(codes[0].rawValue);
      } catch {
        // Frame transitorio (video aún reajustándose): se reintenta en el próximo tick.
      }
      return;
    }

    // Fallback jsQR: el canvas se crea perezosamente la primera vez que hay
    // dimensiones reales, nunca antes (evita un canvas de 0×0).
    let canvas = canvasRef.current;
    if (!canvas) {
      const scale = Math.min(1, JSQR_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result) onDetectRef.current(result.data);
  }, [videoRef]);

  const startCamera = useCallback(async (): Promise<CameraStartResult> => {
    firstFrameLoggedRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        return {
          ok: false,
          reason: "permission",
          message: "Permiso de cámara denegado.",
        };
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        return {
          ok: false,
          reason: "camera",
          message: "No se encontró ninguna cámara en este dispositivo.",
        };
      }
      return {
        ok: false,
        reason: "camera",
        message: "No se pudo acceder a la cámara. Intenta de nuevo.",
      };
    }

    onLogRef.current?.("getUserMedia ok");

    streamRef.current = stream;

    const videoTrack = stream.getVideoTracks()[0];
    onLogRef.current?.(`track: ${videoTrack?.readyState ?? "sin track"}`);

    // Stream en mano = a escanear. Punto. Nada de lo que pase con el
    // elemento <video> de acá para abajo puede demorar esta transición.
    onStreamAcquiredRef.current?.();

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return { ok: false, reason: "camera", message: "No se pudo iniciar el video." };
    }

    video.srcObject = stream;
    // Nunca se espera (await): en algunos Android su promesa no resuelve ni
    // rechaza jamás. Se dispara "en el aire"; el atributo autoPlay del
    // elemento cubre el resto, y detectFrame tolera un video que todavía no
    // reporta datos.
    video.play().catch(() => {});
    video.addEventListener("playing", () => onLogRef.current?.("video playing"), { once: true });

    barcodeDetectorRef.current =
      "BarcodeDetector" in window && window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

    loopRef.current = () => {
      if (!runningRef.current) return;

      if (!detectingRef.current) {
        detectingRef.current = true;
        void detectFrame().finally(() => {
          detectingRef.current = false;
        });
      }

      rafRef.current = requestAnimationFrame(() => loopRef.current());
    };

    runningRef.current = true;
    rafRef.current = requestAnimationFrame(() => loopRef.current());

    return { ok: true };
  }, [videoRef, detectFrame]);

  return { startCamera, stopCamera };
}
