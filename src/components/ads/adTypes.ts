export type AdPlacement =
  | "home-bottom"
  | "activity-bottom"
  | "analysis-bottom"
  | "growth-bottom"
  | "profile-bottom";

export type AdMode = "mock" | "adsense" | "sponsor" | "off";

export interface SponsorAd {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  targetUrl: string;
  placement: AdPlacement;
}
