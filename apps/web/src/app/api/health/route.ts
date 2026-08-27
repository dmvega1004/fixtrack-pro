import { NextResponse } from "next/server";

/**
 * Ping sin autenticación ni dependencia del backend: solo confirma que el
 * teléfono del técnico alcanza a este servidor Next.js. Lo usa el
 * indicador de conectividad (ver lib/connectivity) para verificar de forma
 * activa, en vez de confiar únicamente en navigator.onLine.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
