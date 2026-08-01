import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// A *relative* base, so one build works from every mount point this app is
// served from: `/CRTRemote/` on GitHub Pages, `/remote/` when the relay on the
// Raspberry Pi is serving it, and `file://` if you just open the folder. An
// absolute base would pin it to one of those and 404 every asset in the others.
//
// This only works because routing is hash-based: `#/games` leaves the document
// path alone, so relative asset URLs keep resolving. A history router would
// need the absolute base back.
const BASE = "./";

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
