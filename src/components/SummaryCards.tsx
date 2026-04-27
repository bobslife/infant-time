import { useEffect, useState } from "react";
import { DailyEventSummary, EventSummary } from "../features/events/useEvents";
import {
  formatAge,
  formatDurationMinutes,
  formatRelativeSince,
  formatTime,
  isOverFourHours,
} from "../lib/time";
import { BabyProfile, EventType } from "../types";

interface SummaryCardsProps {
  baby: BabyProfile;
  feedIntervalMinutes: number;
  summary: EventSummary;
  onFeedIntervalChange: (minutes: number) => void;
  onQuickAdd: (eventType: EventType) => void;
}

function formatUntilNextFeed(lastFeedAt: string | null, intervalMinutes: number, now: Date): string {
  if (!lastFeedAt) {
    return "최근 수유 기록 없음";
  }

  const nextFeedAt = new Date(new Date(lastFeedAt).getTime() + intervalMinutes * 60000);
  const diffMinutes = Math.ceil((nextFeedAt.getTime() - now.getTime()) / 60000);

  if (diffMinutes === 0) {
    return "수유 시간입니다";
  }

  if (diffMinutes <= 0) {
    return `${formatDurationMinutes(Math.abs(diffMinutes))} 지남`;
  }

  return `${formatDurationMinutes(diffMinutes)} 남음`;
}

export function SummaryCards({
  baby,
  feedIntervalMinutes,
  summary,
  onFeedIntervalChange,
  onQuickAdd,
}: SummaryCardsProps) {
  const [now, setNow] = useState(new Date());
  const warning = isOverFourHours(summary.lastFeedAt);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

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
          <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("feed")}>
            <span>마지막 수유</span>
            <div className="metric-value">
              <strong>{summary.lastFeedAt ? formatTime(summary.lastFeedAt) : "없음"}</strong>
              <small>
                {formatRelativeSince(summary.lastFeedAt, now)}
                {summary.lastFeedAmountMl !== null ? ` · ${summary.lastFeedAmountMl} ml` : ""}
              </small>
            </div>
          </button>
          <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("poop")}>
            <span>마지막 대변</span>
            <div className="metric-value">
              <strong>{summary.lastPoopAt ? formatTime(summary.lastPoopAt) : "없음"}</strong>
              <small>{formatRelativeSince(summary.lastPoopAt, now)}</small>
            </div>
          </button>
        </div>
        <div className="feed-interval-card">
          <label>
            <span>수유 텀</span>
            <select
              value={feedIntervalMinutes}
              onChange={(event) => onFeedIntervalChange(Number(event.target.value))}
            >
              <option value={120}>2시간</option>
              <option value={150}>2시간 30분</option>
              <option value={180}>3시간</option>
              <option value={210}>3시간 30분</option>
              <option value={240}>4시간</option>
              <option value={300}>5시간</option>
            </select>
          </label>
          <strong>{formatUntilNextFeed(summary.lastFeedAt, feedIntervalMinutes, now)}</strong>
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
