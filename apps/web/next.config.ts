import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al dev server desde otros dispositivos de la red local
  // (ej. el celular del técnico en http://192.168.1.10:3001). Solo aplica
  // en desarrollo; no afecta producción.
  allowedDevOrigins: ["192.168.1.10"],
};

export default nextConfig;
