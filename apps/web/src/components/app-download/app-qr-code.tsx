"use client";

import { QRCodeSVG } from "qrcode.react";

interface AppQrCodeProps {
  value: string;
  size?: number;
}

/**
 * Misma librería que ya usa QrCodeImage para las etiquetas de equipos
 * (qrcode.react) — pero acá SÍ se codifica una URL: es justo el punto de
 * este código (pasar la página de un computador a un celular), a
 * diferencia de las etiquetas físicas, donde codificar una URL sería un
 * problema si cambia el dominio.
 */
export function AppQrCode({ value, size = 176 }: AppQrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      className="rounded-lg"
    />
  );
}
