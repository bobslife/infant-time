import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.infanttime.app",
  appName: "앙팡타임",
  webDir: "dist",
  server: {
    url: "https://infant-time.vercel.app",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
