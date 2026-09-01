import type { CapacitorConfig } from '@capacitor/cli';

// Cascara nativa: la app NO se empaqueta localmente, siempre carga la web
// de produccion. Un despliegue en fixtrackpro.com queda disponible dentro
// de la app sin recompilar ni volver a distribuir el APK.
const config: CapacitorConfig = {
  appId: 'com.taelco.fixtrackpro',
  appName: 'FixTrack Pro',
  webDir: 'www',
  server: {
    url: 'https://fixtrackpro.com',
    androidScheme: 'https',
  },
};

export default config;
