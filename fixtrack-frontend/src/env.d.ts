// src/env.d.ts  ← VERSIÓN FINAL CORREGIDA
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// ESTA LÍNEA ES LA QUE ARREGLA TODO
/// <reference types="vite/client" />