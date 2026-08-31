"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Point {
  x: number;
  y: number;
}

/** Alto fijo de la caja de dibujo en px CSS; el ancho es responsivo (100% del contenedor). */
const PAD_HEIGHT_PX = 160;
/** Margen alrededor del trazo al recortar, para que la rúbrica no quede pegada al borde. */
const TRIM_PADDING_PX = 8;

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

interface SignaturePadProps {
  disabled?: boolean;
  /**
   * Recibe el PNG recortado (fondo transparente) cuando se pulsa Guardar.
   * `true` = se guardó, el recuadro se limpia; `false` = falló, el trazo
   * se conserva para reintentar sin perder el dibujo.
   */
  onSave: (file: File) => Promise<boolean>;
  saveLabel?: string;
}

/**
 * Recuadro de firma manuscrita — canvas con eventos de PUNTERO (cubre
 * dedo, mouse y lápiz con un solo camino, a diferencia de mouse/touch por
 * separado). Sin librería: ~150 líneas de canvas + suavizado por
 * cuadráticas entre puntos medios.
 */
export function SignaturePad({ disabled, onSave, saveLabel = "Guardar firma" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const strokePointsRef = useRef<Point[]>([]);
  /** Caja delimitadora de TODO lo dibujado desde el último borrar (para recortar al exportar). */
  const boundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ajuste a la densidad de pantalla: sin esto el trazo sale pixelado en
  // cualquier celular moderno (dpr 2-3). Todas las coordenadas de dibujo
  // siguen en píxeles CSS gracias a ctx.scale(dpr, dpr) — solo el buffer
  // real del canvas queda más grande.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.25;
    ctx.strokeStyle = "#000000";
  }, []);

  useEffect(() => {
    setupCanvas();
    // Si el usuario rota el celular o cambia el tamaño de ventana, el
    // canvas se re-escala — a costa de perder el trazo actual (recortar y
    // reescalar un canvas ya dibujado deforma el trazo; más simple y
    // predecible es limpiar).
    function handleResize() {
      setupCanvas();
      strokePointsRef.current = [];
      boundsRef.current = null;
      setIsEmpty(true);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  function extendBounds(point: Point) {
    const current = boundsRef.current;
    boundsRef.current = current
      ? {
          minX: Math.min(current.minX, point.x),
          minY: Math.min(current.minY, point.y),
          maxX: Math.max(current.maxX, point.x),
          maxY: Math.max(current.maxY, point.y),
        }
      : { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
  }

  function drawSmoothedSegment(ctx: CanvasRenderingContext2D) {
    const points = strokePointsRef.current;
    const len = points.length;
    if (len < 3) return;
    // Cuadrática entre los puntos medios de los últimos tres puntos: el
    // punto real de en medio queda como punto de control — así el trazo
    // no se ve quebrado, sino curvo entre segmentos.
    const [p0, p1, p2] = points.slice(len - 3);
    const start = midpoint(p0, p1);
    const end = midpoint(p1, p2);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(p1.x, p1.y, end.x, end.y);
    ctx.stroke();
  }

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    const point = pointFromEvent(event);
    strokePointsRef.current = [point];
    extendBounds(point);
    setIsEmpty(false);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    strokePointsRef.current.push(point);
    extendBounds(point);
    drawSmoothedSegment(ctx);
  }

  function endStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    strokePointsRef.current = [];
    canvasRef.current?.releasePointerCapture(event.pointerId);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    boundsRef.current = null;
    strokePointsRef.current = [];
    setIsEmpty(true);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    const bounds = boundsRef.current;
    if (!canvas || !bounds || isEmpty) return;

    // Recorta al área con trazo (+ margen) para no subir márgenes vacíos
    // enormes — las coordenadas de `bounds` están en px CSS, el canvas
    // real vive en px de dispositivo (dpr), así que se escalan al copiar.
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    const sx = Math.max(0, bounds.minX - TRIM_PADDING_PX);
    const sy = Math.max(0, bounds.minY - TRIM_PADDING_PX);
    const sw = Math.min(cssWidth, bounds.maxX + TRIM_PADDING_PX) - sx;
    const sh = Math.min(cssHeight, bounds.maxY + TRIM_PADDING_PX) - sy;

    const trimmed = document.createElement("canvas");
    trimmed.width = Math.round(sw * dpr);
    trimmed.height = Math.round(sh * dpr);
    const trimmedCtx = trimmed.getContext("2d");
    if (!trimmedCtx) return;
    trimmedCtx.drawImage(
      canvas,
      sx * dpr,
      sy * dpr,
      sw * dpr,
      sh * dpr,
      0,
      0,
      trimmed.width,
      trimmed.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      trimmed.toBlob(resolve, "image/png"),
    );
    if (!blob) return;

    const file = new File([blob], "firma.png", { type: "image/png" });

    setIsSaving(true);
    const saved = await onSave(file);
    setIsSaving(false);

    if (saved) {
      handleClear();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        style={{
          width: "100%",
          height: `${PAD_HEIGHT_PX}px`,
          // Sin esto, arrastrar el dedo desplaza la página en vez de
          // dibujar — el requisito que más rompe la experiencia si se pasa
          // por alto.
          touchAction: "none",
        }}
        className="cursor-crosshair rounded-lg border border-dashed border-border bg-white"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty || isSaving}
        >
          Borrar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={disabled || isEmpty || isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSaving ? "Guardando..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
