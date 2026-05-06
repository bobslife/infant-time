import { AdPlacement, SponsorAd } from "./adTypes";

interface SponsorAdBannerProps {
  placement: AdPlacement;
}

const sponsorAds: SponsorAd[] = [
  {
    id: "placeholder-parent-care",
    title: "육아 제휴 안내",
    description: "부모와 아기에게 맞는 제휴 콘텐츠를 준비 중입니다.",
    targetUrl: "#",
    placement: "home-bottom",
  },
];

export function SponsorAdBanner({ placement }: SponsorAdBannerProps) {
  const ad = sponsorAds.find((item) => item.placement === placement) ?? sponsorAds[0];

  return (
    <a className="ad-content sponsor-ad-link" href={ad.targetUrl} onClick={(event) => ad.targetUrl === "#" && event.preventDefault()}>
      {ad.imageUrl ? <img className="ad-image" src={ad.imageUrl} alt="" /> : <div className="ad-visual" aria-hidden="true" />}
      <div className="ad-copy">
        <strong>{ad.title}</strong>
        <span>{ad.description}</span>
      </div>
    </a>
  );
}
