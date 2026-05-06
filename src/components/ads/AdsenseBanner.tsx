import { useEffect } from "react";

interface AdsenseBannerProps {
  client: string;
  slot: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdsenseBanner({ client, slot }: AdsenseBannerProps) {
  useEffect(() => {
    if (!document.querySelector(`script[data-infant-time-adsense="${client}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.infantTimeAdsense = client;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      document.head.appendChild(script);
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.error("AdSense error", error);
    }
  }, [client, slot]);

  return (
    <ins
      className="adsbygoogle ad-adsense-slot"
      data-ad-client={client}
      data-ad-format="auto"
      data-ad-slot={slot}
      data-full-width-responsive="true"
      style={{ display: "block" }}
    />
  );
}
