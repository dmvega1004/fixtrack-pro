import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { Apple, Download, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppQrCode } from "@/components/app-download/app-qr-code";
import { APP_DOWNLOAD_PATH, APP_RELEASE } from "@/lib/app-release";
import { formatDateOnly } from "@/lib/format/date-only";

/**
 * Dominio fijo de producción — igual que apps/mobile/capacitor.config.ts
 * (server.url). No depende de una variable de entorno: es el mismo valor
 * en cualquier ambiente donde se abra esta página, porque el QR y el
 * enlace que se comparte siempre deben apuntar al sitio real.
 */
const APP_PAGE_URL = "https://fixtrackpro.com/app";

export const metadata: Metadata = {
  title: "Descargar FixTrack Pro",
  description:
    "Instala FixTrack Pro en tu celular Android, o agrégala a la pantalla de inicio en iPhone.",
};

interface StepProps {
  n: number;
  children: ReactNode;
}

function Step({ n, children }: StepProps) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </li>
  );
}

/**
 * PÚBLICA, sin sesión: quien va a instalar la app todavía no tiene
 * cuenta. Por eso vive fuera de (dashboard) — esa carpeta es la única con
 * el candado de sesión (ver (dashboard)/layout.tsx) — y no llama a
 * getSession() en ningún punto de este archivo.
 */
export default function AppDownloadPage() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-10 text-foreground">
      <h1 className="sr-only">Descargar FixTrack Pro</h1>

      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* 1. Logo y nombre */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Image
            src="/brand/logo-sm.png"
            alt="FixTrack Pro"
            width={220}
            height={51}
            priority
            unoptimized
          />
          <p className="text-sm text-muted-foreground">
            Instala la aplicación en tu celular
          </p>
        </div>

        {/* 2. Botón de descarga, versión y fecha */}
        <div className="flex w-full flex-col items-center gap-1.5">
          <a
            href={APP_DOWNLOAD_PATH}
            download
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Download className="size-5" />
            Descargar para Android
          </a>
          <p className="text-xs text-muted-foreground">
            Versión {APP_RELEASE.version} · {formatDateOnly(APP_RELEASE.releaseDate)}
          </p>
        </div>

        {/* 3. Instrucciones de instalación */}
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Cómo instalarla</h2>
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Toca <strong className="text-foreground">Descargar para Android</strong> arriba
                y espera a que termine.
              </Step>
              <Step n={2}>
                Abre el archivo descargado: desde el aviso que aparece abajo de la
                pantalla, o desde tu app de Archivos, en Descargas.
              </Step>
              <Step n={3}>
                El celular va a mostrar una advertencia de seguridad — es normal,
                pasa con cualquier app que no venga de Google Play. Toca{" "}
                <strong className="text-foreground">Ajustes</strong>, activa el
                permiso para instalar desde tu navegador y vuelve atrás.
              </Step>
              <Step n={4}>
                Toca <strong className="text-foreground">Instalar</strong>. Cuando
                termine, ya tienes FixTrack Pro lista para abrir.
              </Step>
            </ol>
          </CardContent>
        </Card>

        {/* 4. QR de esta misma página */}
        <div className="flex flex-col items-center gap-2">
          <AppQrCode value={APP_PAGE_URL} />
          <p className="max-w-64 text-center text-xs text-muted-foreground">
            Escanea este código con el celular para abrir esta misma página ahí
          </p>
        </div>

        {/* 5. Bloque iPhone — siempre visible, el enlace se comparte entre dispositivos */}
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Apple className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold">¿Tienes iPhone?</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Apple no permite instalar aplicaciones fuera de la App Store, pero
              puedes agregar FixTrack Pro a tu pantalla de inicio y usarla igual
              que cualquier otra app.
            </p>
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Abre este enlace en <strong className="text-foreground">Safari</strong> — no
                funciona desde Chrome ni otro navegador.
              </Step>
              <Step n={2}>
                Toca el ícono de compartir{" "}
                <Share className="inline size-3.5 -translate-y-px text-foreground" /> en
                la barra inferior.
              </Step>
              <Step n={3}>
                Baja hasta <strong className="text-foreground">Añadir a pantalla de inicio</strong> y
                confirma. Va a quedar un ícono de FixTrack Pro en tu pantalla.
              </Step>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
