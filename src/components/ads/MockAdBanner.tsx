import { AdPlacement } from "./adTypes";

interface MockAdBannerProps {
  placement: AdPlacement;
}

const mockCopy: Record<AdPlacement, { title: string; description: string }> = {
  "home-bottom": {
    title: "부모를 위한 추천",
    description: "육아용품과 케어 상품을 확인해보세요.",
  },
  "activity-bottom": {
    title: "빠른 육아 준비",
    description: "기록 후 필요한 수유, 기저귀, 외출 용품을 살펴보세요.",
  },
  "analysis-bottom": {
    title: "오늘 리듬에 맞춘 추천",
    description: "육아 패턴에 맞는 생활용품 정보를 준비 중입니다.",
  },
  "growth-bottom": {
    title: "성장 기록을 위한 추천",
    description: "키, 몸무게, 체온 관리에 필요한 용품을 모아볼 수 있어요.",
  },
  "profile-bottom": {
    title: "가족 육아 운영 추천",
    description: "공동 기록과 백업에 어울리는 제휴 안내 영역입니다.",
  },
};

export function MockAdBanner({ placement }: MockAdBannerProps) {
  const copy = mockCopy[placement];

  return (
    <div className="ad-content">
      <div className="ad-visual" aria-hidden="true" />
      <div className="ad-copy">
        <strong>{copy.title}</strong>
        <span>{copy.description}</span>
      </div>
    </div>
  );
}
