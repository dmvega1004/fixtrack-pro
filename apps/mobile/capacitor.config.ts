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
    // Si falla la carga de la pagina principal (sin red, DNS, etc.), la
    // vista web muestra esta pagina local en vez del error del navegador.
    // Se sirve desde los assets empaquetados (www/offline.html), no desde
    // fixtrackpro.com, asi que funciona exactamente cuando no hay conexion.
    errorPath: 'offline.html',
  },
};

export default config;
