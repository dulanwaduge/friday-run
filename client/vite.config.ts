import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-google-maps")) return "maps-vendor";
          if (id.includes("recharts")) return "charts-vendor";
          if (id.includes("/d3-") || id.includes("victory-vendor")) {
            return "chart-math-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
