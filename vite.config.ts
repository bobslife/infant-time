import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["infant-time-logo.png", "icons/*.svg"],
      manifestFilename: "manifest.json",
      manifest: {
        name: "Infant Time",
        short_name: "Infant Time",
        description: "아기 수유, 수면, 소변, 대변 기록 앱",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#dcecff",
        icons: [
          {
            src: "/infant-time-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/infant-time-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
  },
});
