import { useEffect, useRef } from "react";
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

interface NativeAdMobBannerProps {
  adId: string;
  isTesting: boolean;
}

let initialized = false;
let consentPromise: Promise<boolean> | null = null;
let isBannerSuppressed = false;
let activeBannerOwner: symbol | null = null;
let bannerOperation: Promise<void> = Promise.resolve();

function enqueueBannerOperation(operation: () => Promise<void>): Promise<void> {
  bannerOperation = bannerOperation.then(operation, operation);
  return bannerOperation;
}

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

async function ensureAdMobConsent(isTesting: boolean): Promise<boolean> {
  if (consentPromise) {
    return consentPromise;
  }

  consentPromise = (async () => {
    await ensureAdMobInitialized(isTesting);

    let consentInfo = await AdMob.requestConsentInfo();
    if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
      consentInfo = await AdMob.showConsentForm();
    }

    return consentInfo.canRequestAds;
  })();

  try {
    return await consentPromise;
  } catch (error) {
    consentPromise = null;
    throw error;
  }
}

export function NativeAdMobBanner({ adId, isTesting }: NativeAdMobBannerProps) {
  const mountedRef = useRef(true);

  useEffect(() => {
    const owner = Symbol("admob-banner");
    mountedRef.current = true;
    activeBannerOwner = owner;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    async function showBanner() {
      if (isBannerSuppressed) {
        return;
      }

      try {
        let canRequestAds = false;
        try {
          canRequestAds = await ensureAdMobConsent(isTesting);
        } catch (error) {
          // The banner is always requested as non-personalized (`npa: true`).
          // A temporary UMP/configuration failure must not disable every ad in
          // regions where a consent form is not required.
          console.warn("AdMob consent check failed; continuing with a non-personalized ad", error);
          canRequestAds = true;
        }
        if (!canRequestAds) {
          return;
        }
        if (!mountedRef.current || activeBannerOwner !== owner || isBannerSuppressed) {
          return;
        }

        await enqueueBannerOperation(async () => {
          if (!mountedRef.current || activeBannerOwner !== owner || isBannerSuppressed) {
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
        });
      } catch (error) {
        console.error("AdMob banner error", error);
      }
    }

    function handleVisibilityChange(event: Event) {
      const nextHidden = Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden);
      isBannerSuppressed = nextHidden;

      if (nextHidden) {
        void enqueueBannerOperation(() => AdMob.removeBanner()).catch(() => undefined);
        return;
      }

      void showBanner();
    }

    window.addEventListener("infant-time-admob-visibility", handleVisibilityChange);
    void showBanner();

    return () => {
      mountedRef.current = false;
      window.removeEventListener("infant-time-admob-visibility", handleVisibilityChange);
      if (activeBannerOwner === owner) {
        activeBannerOwner = null;
        if (Capacitor.isNativePlatform()) {
          void enqueueBannerOperation(() => AdMob.removeBanner()).catch(() => undefined);
        }
      }
    };
  }, [adId, isTesting]);

  return null;
}
