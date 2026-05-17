import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

export const CURRENT_APP_VERSION = "1.0.5";
export const MIN_SUPPORTED_APP_VERSION = "1.0.5";

export interface AppUpdateState {
  currentVersion: string | null;
  isChecking: boolean;
  isRequired: boolean;
  updateUrl: string;
}

function parseVersion(version: string): number[] {
  return version
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

export function isVersionLessThan(current: string, minimum: string): boolean {
  const currentParts = parseVersion(current);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (currentPart < minimumPart) {
      return true;
    }

    if (currentPart > minimumPart) {
      return false;
    }
  }

  return false;
}

export function getUpdateUrl(): string {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    return import.meta.env.VITE_IOS_APP_STORE_URL ?? import.meta.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "https://apps.apple.com/";
  }

  if (platform === "android") {
    return (
      import.meta.env.VITE_ANDROID_PLAY_STORE_URL ??
      import.meta.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL ??
      "https://play.google.com/store/apps/details?id=com.infanttime.app"
    );
  }

  return "https://infant-time.vercel.app/";
}

export async function getInstalledAppVersion(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const info = await CapacitorApp.getInfo();
  return info.version || null;
}
