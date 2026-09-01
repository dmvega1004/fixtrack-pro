"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * La vista web de Android (usada por el APK de Capacitor) no implementa
 * window.print(): la llamada no hace nada, sin abrir dialogo ni lanzar
 * error. Es una limitacion de esa plataforma, no un defecto del codigo
 * web. Por eso esta misma build de la web tiene dos caminos segun donde
 * corre:
 *
 *   - Navegador (computador o celular): window.print(), igual que siempre.
 *   - Dentro del APK: el plugin nativo "Print" (ver
 *     apps/mobile/android/.../PrintPlugin.java), que abre el dialogo de
 *     impresion del sistema Android con el contenido actual de la pagina.
 *
 * Capacitor.isNativePlatform() es false en cualquier navegador normal —
 * con o sin este modulo cargado, con o sin @capacitor/core instalado en
 * el sitio que se sirve — asi que printDocument() funciona igual en
 * ambos builds sin necesidad de otra deteccion.
 */

interface PrintPlugin {
  print(options: { title: string }): Promise<void>;
}

const NativePrint = registerPlugin<PrintPlugin>("Print");

export async function printDocument(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativePrint.print({ title: document.title });
      return;
    } catch {
      // Si el puente nativo falla por cualquier razon, no dejamos al
      // usuario sin opcion: cae al flujo de navegador de mas abajo.
    }
  }
  window.print();
}
