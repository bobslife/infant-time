import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL ?? "https://infant-time.vercel.app";

const config: CapacitorConfig = {
  appId: "com.infanttime.app",
  appName: "앙팡타임",
  webDir: "dist",
};

if (serverUrl) {
  config.server = {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  };
}

export default config;
