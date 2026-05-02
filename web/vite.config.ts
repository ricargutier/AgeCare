import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/auth": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/elders": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/alerts": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/medications": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/audit": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/push": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
