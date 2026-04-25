import { EventSummary } from "../features/events/useEvents";
import {
  formatAge,
  formatDurationMinutes,
  formatRelativeSince,
  formatTime,
  isOverFourHours,
} from "../lib/time";
import { BabyProfile } from "../types";

interface SummaryCardsProps {
  baby: BabyProfile;
  summary: EventSummary;
}

function formatGap(minutes: number | null) {
  if (minutes === null) {
    return "아직 계산 불가";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}분`;
  }

  if (remainingMinutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainingMinutes}분`;
}

export function SummaryCards({ baby, summary }: SummaryCardsProps) {
  const warning = isOverFourHours(summary.lastFeedAt);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">{formatAge(baby.birthDate)}</p>
        <h1>{baby.name}</h1>
        <p className={`hero-copy ${warning ? "hero-warning" : ""}`}>
          {warning
            ? "수유 기록이 4시간 넘게 없습니다. 지금 상태를 확인해 주세요."
            : "오늘의 돌봄 기록을 한 화면에서 확인할 수 있습니다."}
        </p>
        <div className="hero-grid">
          <article className="metric-card">
            <span>마지막 수유</span>
            <strong>{summary.lastFeedAt ? formatTime(summary.lastFeedAt) : "없음"}</strong>
            <small>{formatRelativeSince(summary.lastFeedAt)}</small>
          </article>
          <article className="metric-card">
            <span>마지막 대변</span>
            <strong>{summary.lastPoopAt ? formatTime(summary.lastPoopAt) : "없음"}</strong>
            <small>{formatRelativeSince(summary.lastPoopAt)}</small>
          </article>
        </div>
      </section>

      <section className="summary-grid">
        <article className="panel compact">
          <p className="eyebrow">오늘 수유</p>
          <strong>{summary.todayFeedCount}회</strong>
          <small>총 {summary.todayFeedTotalMl} ml</small>
        </article>
        <article className="panel compact">
          <p className="eyebrow">오늘 수면</p>
          <strong>
            {summary.todaySleepMinutes > 0
              ? formatDurationMinutes(summary.todaySleepMinutes)
              : `${summary.todaySleepCount}회`}
          </strong>
        </article>
        <article className="panel compact">
          <p className="eyebrow">오늘 소변</p>
          <strong>{summary.todayPeeCount}회</strong>
        </article>
        <article className="panel compact">
          <p className="eyebrow">오늘 대변</p>
          <strong>{summary.todayPoopCount}회</strong>
        </article>
      </section>
      <section className="panel compact wide-metric">
        <p className="eyebrow">최근 수유 간격</p>
        <strong>{formatGap(summary.latestFeedGapMinutes)}</strong>
      </section>
    </>
  );
}
