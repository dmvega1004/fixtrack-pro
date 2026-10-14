"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * La vista web de Android (usada por el APK de Capacitor) ignora el
 * atributo download de los enlaces: un <a download> no descarga nada, sin
 * aviso ni error. Igual que native-print.ts, esta misma build de la web
 * tiene dos caminos segun donde corre:
 *
 *   - Navegador (computador o celular): descarga con <a download>, igual
 *     que siempre.
 *   - Dentro del APK: el plugin nativo "FileShare" (ver
 *     apps/mobile/android/.../FileSharePlugin.java), que guarda la imagen
 *     con el nombre recibido y abre la hoja de compartir del sistema.
 *
 * La web se despliega antes de que todos actualicen el APK: un APK viejo
 * no tiene el plugin. Ahi el <a download> tampoco sirve, asi que en vez de
 * fallar en silencio se devuelve "app-update-required" para que la
 * pantalla le diga al usuario que hacer.
 */

interface FileSharePlugin {
  shareImage(options: { data: string; filename: string; title: string }): Promise<void>;
}

const NativeFileShare = registerPlugin<FileSharePlugin>("FileShare");

export type SaveImageResult = "saved" | "app-update-required";

export async function saveImage(dataUrl: string, filename: string): Promise<SaveImageResult> {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("FileShare")) {
      return "app-update-required";
    }
    await NativeFileShare.shareImage({ data: dataUrl, filename, title: filename });
    return "saved";
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
  return "saved";
}
