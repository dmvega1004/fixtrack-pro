import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al dev server desde otros dispositivos de la red local
  // (ej. el celular del técnico en http://192.168.1.10:3001). Solo aplica
  // en desarrollo; no afecta producción.
  allowedDevOrigins: ["192.168.1.10", "192.168.1.15", "192.168.1.8"],

  async headers() {
    return [
      {
        // El APK de /public/app se sirve como archivo estático, pero la
        // tabla de tipos MIME por defecto de algunos hosts/CDN no conoce
        // la extensión .apk y lo entrega como binario genérico
        // (application/octet-stream) — el celular lo descarga pero no lo
        // reconoce como instalable. Se fuerza el tipo correcto acá; Next
        // agrega estos headers sobre la respuesta del archivo estático,
        // sin necesidad de una Route Handler que lo lea y lo reenvíe.
        source: "/app/:file*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: "attachment",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
