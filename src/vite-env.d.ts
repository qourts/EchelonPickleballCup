/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Development server only: set to "fixture" to use synthetic demo data. Ignored in builds. */
  readonly VITE_PORTAL_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
