import { useEffect, useRef } from "react";
import { AdMob, BannerAdPosition, BannerAdSize, MaxAdContentRating } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

interface NativeAdMobBannerProps {
  adId: string;
  isTesting: boolean;
}

let initialized = false;
let isBannerSuppressed = false;

async function ensureAdMobInitialized(isTesting: boolean) {
  if (initialized) {
    return;
  }

  await AdMob.initialize({
    initializeForTesting: isTesting,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    maxAdContentRating: MaxAdContentRating.General,
  });
  initialized = true;
}

export function NativeAdMobBanner({ adId, isTesting }: NativeAdMobBannerProps) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    async function showBanner() {
      if (isBannerSuppressed) {
        return;
      }

      try {
        await ensureAdMobInitialized(isTesting);
        if (!mountedRef.current || isBannerSuppressed) {
          return;
        }

        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 76,
          isTesting,
          npa: true,
        });
      } catch (error) {
        console.error("AdMob banner error", error);
      }
    }

    function handleVisibilityChange(event: Event) {
      const nextHidden = Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden);
      isBannerSuppressed = nextHidden;

      if (nextHidden) {
        void AdMob.removeBanner().catch(() => undefined);
        return;
      }

      void showBanner();
    }

    window.addEventListener("infant-time-admob-visibility", handleVisibilityChange);
    void showBanner();

    return () => {
      mountedRef.current = false;
      window.removeEventListener("infant-time-admob-visibility", handleVisibilityChange);
      if (Capacitor.isNativePlatform()) {
        void AdMob.removeBanner().catch(() => undefined);
      }
    };
  }, [adId, isTesting]);

  return null;
}
