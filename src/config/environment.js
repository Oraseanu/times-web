const DEFAULT_CONFIG = {
  appMode: "demo",
  localApiBaseUrl: "http://127.0.0.1:8787",
  cloudApiBaseUrl: "",
};

const rawConfig = typeof __APP_CONFIG__ === "object" && __APP_CONFIG__ != null
  ? __APP_CONFIG__
  : {};

export const appConfig = {
  ...DEFAULT_CONFIG,
  ...rawConfig,
};

export const APP_MODES = {
  DEMO: "demo",
  LOCAL_PROD: "local_prod",
  CLOUD_PROD: "cloud_prod",
};
