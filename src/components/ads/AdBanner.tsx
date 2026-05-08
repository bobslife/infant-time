import { AdsenseBanner } from "./AdsenseBanner";
import { AdMode, AdPlacement } from "./adTypes";
import { MockAdBanner } from "./MockAdBanner";
import { NativeAdMobBanner } from "./NativeAdMobBanner";
import { SponsorAdBanner } from "./SponsorAdBanner";

interface AdBannerProps {
  placement: AdPlacement;
  className?: string;
}

const slotKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "VITE_ADSENSE_SLOT_HOME_BOTTOM",
  "activity-bottom": "VITE_ADSENSE_SLOT_ACTIVITY_BOTTOM",
  "analysis-bottom": "VITE_ADSENSE_SLOT_ANALYSIS_BOTTOM",
  "growth-bottom": "VITE_ADSENSE_SLOT_GROWTH_BOTTOM",
  "profile-bottom": "VITE_ADSENSE_SLOT_PROFILE_BOTTOM",
};

const nextPublicSlotKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM",
  "activity-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_ACTIVITY_BOTTOM",
  "analysis-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_ANALYSIS_BOTTOM",
  "growth-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_GROWTH_BOTTOM",
  "profile-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_PROFILE_BOTTOM",
};

const admobBannerKeys: Record<AdPlacement, keyof ImportMetaEnv> = {
  "home-bottom": "VITE_ADMOB_BANNER_HOME_BOTTOM",
  "activity-bottom": "VITE_ADMOB_BANNER_ACTIVITY_BOTTOM",
  "analysis-bottom": "VITE_ADMOB_BANNER_ANALYSIS_BOTTOM",
  "growth-bottom": "VITE_ADMOB_BANNER_GROWTH_BOTTOM",
  "profile-bottom": "VITE_ADMOB_BANNER_PROFILE_BOTTOM",
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

function getMode(): AdMode {
  const rawMode = getEnv("VITE_AD_MODE") || getEnv("NEXT_PUBLIC_AD_MODE") || "mock";

  if (rawMode === "adsense" || rawMode === "admob" || rawMode === "sponsor" || rawMode === "off") {
    return rawMode;
  }

  return "mock";
}

function getAdsenseClient(): string {
  return getEnv("VITE_ADSENSE_CLIENT") || getEnv("NEXT_PUBLIC_ADSENSE_CLIENT");
}

function getAdsenseSlot(placement: AdPlacement): string {
  return getEnv(slotKeys[placement]) || getEnv(nextPublicSlotKeys[placement]);
}

function getAdMobBannerId(placement: AdPlacement): string {
  return getEnv(admobBannerKeys[placement]) || getEnv(nextPublicAdmobBannerKeys[placement]) || defaultAdMobBannerId;
}

function isAdMobTesting(): boolean {
  const rawValue = getEnv("VITE_ADMOB_TESTING") || getEnv("NEXT_PUBLIC_ADMOB_TESTING");
  return rawValue === "1" || rawValue === "true";
}

export function AdBanner({ placement, className }: AdBannerProps) {
  const mode = getMode();

  if (mode === "off") {
    return null;
  }

  if (mode === "admob") {
    return getAdMobBannerId(placement) ? (
      <NativeAdMobBanner adId={getAdMobBannerId(placement)} isTesting={isAdMobTesting()} />
    ) : (
      <MockAdBanner placement={placement} />
    );
  }

  const content =
    mode === "adsense" ? (
      getAdsenseClient() && getAdsenseSlot(placement) ? (
        <AdsenseBanner client={getAdsenseClient()} slot={getAdsenseSlot(placement)} />
      ) : (
        <MockAdBanner placement={placement} />
      )
    ) : mode === "sponsor" ? (
      <SponsorAdBanner placement={placement} />
    ) : (
      <MockAdBanner placement={placement} />
    );

  return (
    <section className={`ad-banner ${className ?? ""}`} aria-label="광고">
      <div className="ad-label">광고</div>
      {content}
    </section>
  );
}
