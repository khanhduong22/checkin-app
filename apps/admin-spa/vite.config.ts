import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const momentPath = path.resolve(path.dirname(require.resolve("moment/package.json")), "moment.js");

// https://vitejs.dev/config/
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^moment$/, replacement: momentPath },
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/react-router-dom/")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("/lucide-react/") ||
              id.includes("/@radix-ui/react-tooltip/") ||
              id.includes("/@radix-ui/react-dialog/") ||
              id.includes("/@radix-ui/react-dropdown-menu/") ||
              id.includes("/@radix-ui/react-tabs/")
            ) {
              return "vendor-ui";
            }
            if (id.includes("/recharts/")) {
              return "vendor-charts";
            }
          }
        },
      },
    },
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
