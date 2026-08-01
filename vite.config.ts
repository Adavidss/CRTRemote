import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Deployed as a GitHub Pages project site. Routing is hash-based so a deep
// link survives a hard refresh without Pages needing a 404 rewrite.
const BASE = "/CRTRemote/";

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3120,
    strictPort: true,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) only accepts the function form.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
});
