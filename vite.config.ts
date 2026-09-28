import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { quorumApi } from "./server/api";

/** Mounts the shared-store API on the dev and preview servers. */
const api = (): Plugin => ({
  name: "quorum-api",
  configureServer(server) {
    server.middlewares.use(quorumApi);
  },
  configurePreviewServer(server) {
    server.middlewares.use(quorumApi);
  },
});

export default defineConfig({
  plugins: [api(), react(), tailwindcss()],
});
