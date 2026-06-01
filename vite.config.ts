import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: true,
    port: 8080,
    proxy: {
      "/api/sec": {
        target: "https://data.sec.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/sec/, ""),
        headers: {
          "User-Agent": "SMME Software Market Model Engine (hackathon; not for redistribution)",
        },
      },
      "/api/sec-www": {
        target: "https://www.sec.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/sec-www/, ""),
        headers: {
          "User-Agent": "SMME Software Market Model Engine (hackathon; not for redistribution)",
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
