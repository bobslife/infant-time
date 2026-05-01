import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL || "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.infanttime.app",
  appName: "Infant Time",
  webDir: "dist",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
};

export default config;
