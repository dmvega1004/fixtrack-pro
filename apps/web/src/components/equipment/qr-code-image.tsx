"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrCodeImageProps {
  /** Valor exacto a codificar: el UUID de `qrCode`, nunca una URL — la
   * etiqueta física debe seguir siendo válida aunque cambie el dominio. */
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeImage({ value, size = 160, className }: QrCodeImageProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      className={className}
    />
  );
}
