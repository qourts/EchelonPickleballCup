/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Qourts portal API, e.g. https://portal.example.com. Unset = guide-only mode. */
  readonly VITE_PORTAL_API_URL?: string
  /** Development server only: set to "fixture" to use synthetic demo data. Ignored in builds. */
  readonly VITE_PORTAL_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
