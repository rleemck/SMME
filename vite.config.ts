import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// SEC requires User-Agent with app name + contact email (see sec.gov/os/accessing-edgar-data)
const secUserAgent = `SMME-MarketModel-Engine ${process.env.SEC_CONTACT_EMAIL?.trim() || "smme-hackathon@example.com"}`;
const secProxyHeaders = {
  "User-Agent": secUserAgent,
  Accept: "application/json",
};

export default defineConfig({
  server: {
    host: true,
    port: 8080,
    proxy: {
      // Must be listed before /api/sec — otherwise /api/sec-www matches the /api/sec prefix
      "/api/sec-www": {
        target: "https://www.sec.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/sec-www/, ""),
        headers: secProxyHeaders,
      },
      "/api/sec": {
        target: "https://data.sec.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/sec/, ""),
        headers: secProxyHeaders,
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
