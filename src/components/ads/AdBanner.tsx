import { Capacitor } from "@capacitor/core";
import { AdPlacement } from "./adTypes";
import { NativeAdMobBanner } from "./NativeAdMobBanner";

interface AdBannerProps {
  placement: AdPlacement;
}

const admobBannerKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "VITE_ADMOB_BANNER_HOME_BOTTOM",
  "activity-bottom": "VITE_ADMOB_BANNER_ACTIVITY_BOTTOM",
  "analysis-bottom": "VITE_ADMOB_BANNER_ANALYSIS_BOTTOM",
  "growth-bottom": "VITE_ADMOB_BANNER_GROWTH_BOTTOM",
  "profile-bottom": "VITE_ADMOB_BANNER_PROFILE_BOTTOM",
};

const iosAdmobBannerKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "VITE_ADMOB_IOS_BANNER_HOME_BOTTOM",
  "activity-bottom": "VITE_ADMOB_IOS_BANNER_ACTIVITY_BOTTOM",
  "analysis-bottom": "VITE_ADMOB_IOS_BANNER_ANALYSIS_BOTTOM",
  "growth-bottom": "VITE_ADMOB_IOS_BANNER_GROWTH_BOTTOM",
  "profile-bottom": "VITE_ADMOB_IOS_BANNER_PROFILE_BOTTOM",
};

const androidAdmobBannerKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "VITE_ADMOB_ANDROID_BANNER_HOME_BOTTOM",
  "activity-bottom": "VITE_ADMOB_ANDROID_BANNER_ACTIVITY_BOTTOM",
  "analysis-bottom": "VITE_ADMOB_ANDROID_BANNER_ANALYSIS_BOTTOM",
  "growth-bottom": "VITE_ADMOB_ANDROID_BANNER_GROWTH_BOTTOM",
  "profile-bottom": "VITE_ADMOB_ANDROID_BANNER_PROFILE_BOTTOM",
};

const nextPublicAdmobBannerKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "NEXT_PUBLIC_ADMOB_BANNER_HOME_BOTTOM",
  "activity-bottom": "NEXT_PUBLIC_ADMOB_BANNER_ACTIVITY_BOTTOM",
  "analysis-bottom": "NEXT_PUBLIC_ADMOB_BANNER_ANALYSIS_BOTTOM",
  "growth-bottom": "NEXT_PUBLIC_ADMOB_BANNER_GROWTH_BOTTOM",
  "profile-bottom": "NEXT_PUBLIC_ADMOB_BANNER_PROFILE_BOTTOM",
};

const defaultAdMobBannerId = "ca-app-pub-7377226666674587/1204236224";

function getEnv(key: keyof ImportMetaEnv): string {
  return String(import.meta.env[key] ?? "");
}

function isAdMobMode(): boolean {
  const rawMode = (getEnv("VITE_AD_MODE") || getEnv("NEXT_PUBLIC_AD_MODE") || "mock").trim().toLowerCase();
  return rawMode === "admob";
}

function getAdMobBannerId(placement: AdPlacement): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return getEnv(androidAdmobBannerKeys[placement]);
  }

  if (platform === "ios") {
    return (
      getEnv(iosAdmobBannerKeys[placement]) ||
      getEnv(admobBannerKeys[placement]) ||
      getEnv(nextPublicAdmobBannerKeys[placement]) ||
      defaultAdMobBannerId
    );
  }

  return getEnv(admobBannerKeys[placement]) || getEnv(nextPublicAdmobBannerKeys[placement]);
}

function isAdMobTesting(): boolean {
  const rawValue = getEnv("VITE_ADMOB_TESTING") || getEnv("NEXT_PUBLIC_ADMOB_TESTING");
  return rawValue === "1" || rawValue === "true";
}

export function AdBanner({ placement }: AdBannerProps) {
  const adId = getAdMobBannerId(placement);

  if (!isAdMobMode() || !adId) {
    return null;
  }

  return <NativeAdMobBanner adId={adId} isTesting={isAdMobTesting()} />;
}
