import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }

            if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
              return "vendor-charts";
            }

            if (id.includes("@capacitor")) {
              return "vendor-capacitor";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
