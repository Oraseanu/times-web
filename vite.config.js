import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_HOST || env.HOST || "127.0.0.1";
  const port = Number(env.VITE_PORT || env.PORT || 5173);

  return {
    plugins: [react(), cloudflare()],
    define: {
      __APP_CONFIG__: JSON.stringify({
        appMode: env.APP_MODE || "demo",
        localApiBaseUrl: env.LOCAL_API_BASE_URL || "",
        cloudApiBaseUrl: env.CLOUD_API_BASE_URL || "",
      }),
    },
    server: {
      open: true,
      host,
      port,
    },
    preview: {
      host,
      port,
    },
  };
});
