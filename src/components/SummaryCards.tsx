import { DailyEventSummary, EventSummary } from "../features/events/useEvents";
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

export function SummaryCards({ baby, summary }: SummaryCardsProps) {
  const warning = isOverFourHours(summary.lastFeedAt);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">{formatAge(baby.birthDate)}</p>
        <h1>{baby.name}</h1>
        {warning ? (
          <p className="hero-copy hero-warning">
            <span aria-hidden="true">!</span>
            수유기록이 4시간 넘게 없습니다.
          </p>
        ) : (
          <p className="hero-copy">오늘의 돌봄 기록을 한 화면에서 확인할 수 있습니다.</p>
        )}
        <div className="hero-grid">
          <article className="metric-card">
            <span>마지막 수유</span>
            <strong>{summary.lastFeedAt ? formatTime(summary.lastFeedAt) : "없음"}</strong>
            <small>
              {formatRelativeSince(summary.lastFeedAt)}
              {summary.lastFeedAmountMl !== null ? ` · ${summary.lastFeedAmountMl} ml` : ""}
            </small>
          </article>
          <article className="metric-card">
            <span>마지막 대변</span>
            <strong>{summary.lastPoopAt ? formatTime(summary.lastPoopAt) : "없음"}</strong>
            <small>{formatRelativeSince(summary.lastPoopAt)}</small>
          </article>
        </div>
      </section>
    </>
  );
}

interface AnalysisCardsProps {
  selectedDate: string;
  summary: DailyEventSummary;
  onDateChange: (date: string) => void;
}

export function AnalysisCards({ selectedDate, summary, onDateChange }: AnalysisCardsProps) {
  return (
    <>
      <section className="panel analysis-header">
        <input
          aria-label="분석 날짜"
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </section>
      <section className="summary-grid">
        <article className="panel compact">
          <p className="eyebrow">수유</p>
          <strong>{summary.feedCount}회</strong>
          <small>총 {summary.feedTotalMl} ml</small>
        </article>
        <article className="panel compact">
          <p className="eyebrow">수면</p>
          <strong>
            {summary.sleepMinutes > 0
              ? formatDurationMinutes(summary.sleepMinutes)
              : `${summary.sleepCount}회`}
          </strong>
        </article>
        <article className="panel compact">
          <p className="eyebrow">소변</p>
          <strong>{summary.peeCount}회</strong>
        </article>
        <article className="panel compact">
          <p className="eyebrow">대변</p>
          <strong>{summary.poopCount}회</strong>
        </article>
      </section>
    </>
  );
}
