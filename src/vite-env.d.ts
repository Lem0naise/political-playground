/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional analytics Worker origin, e.g. https://analytics.indigo.spot */
  readonly VITE_ANALYTICS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
