import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Etapa 2-D: esta carpeta es TODO el contenido que el service worker
    // puede llegar a servir en una dirección que no le corresponde en el
    // árbol de rutas de Next (ver apps/web/public/sw.js y
    // order-detail-offline-by-path.tsx). Se probó ahí mismo que un
    // next/link o un router.push disparado en ese estado no navega — ni
    // cambia la URL, ni registra nada, simplemente no hace nada. Esto no
    // se documenta, se hace fallar: cualquier archivo que se agregue acá
    // hereda la prohibición sin que nadie tenga que acordarse de pedirla.
    // Usa OfflineSafeLink (./offline-safe-link) o un <a href> plano.
    files: ["src/components/work-orders/offline-detail/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Esta carpeta puede servirse en una dirección que no le corresponde — un next/link ahí no navega (ver OfflineSafeLink). Usa OfflineSafeLink o un <a href> plano.",
            },
            {
              name: "next/navigation",
              message:
                "Mismo motivo que next/link: el enrutador de cliente puede quedar inconsistente en esta pantalla. Lee window.location directo (ver order-detail-offline-by-path.tsx) en vez de useRouter/usePathname/redirect.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
