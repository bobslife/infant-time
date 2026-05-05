import { useEffect, useState } from "react";
import { buildDailySummary, DailyEventSummary, EventSummary } from "../features/events/useEvents";
import {
  formatAge,
  formatDurationMinutes,
  formatRelativeSince,
  formatTime,
  isOverFourHours,
} from "../lib/time";
import { BabyEvent, BabyProfile, EventType, PoopColor } from "../types";

interface SummaryCardsProps {
  baby: BabyProfile;
  feedIntervalMinutes: number;
  summary: EventSummary;
  onFeedIntervalChange: (minutes: number) => void;
  onQuickAdd: (eventType: EventType) => void;
}

const poopAmountLabels = {
  small: "적음",
  normal: "보통",
  large: "많음",
};

const poopColorLabels = {
  ocher: "황토색",
  brown: "갈색",
  dark_brown: "진한 갈색",
  green: "쑥색",
  red_orange: "다홍색",
};

const poopColorClasses = {
  ocher: "ocher",
  brown: "brown",
  dark_brown: "dark-brown",
  green: "green",
  red_orange: "red-orange",
};

const defaultProfileImages: Record<BabyProfile["gender"], string> = {
  boy: "/images/default-profile-boy.png",
  girl: "/images/default-profile-girl.png",
};

function getElapsedMinutes(value: string | null, now: Date): number | null {
  if (!value) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60000));
}

function formatElapsedTitle(lastFeedAt: string | null, now: Date): string {
  if (!lastFeedAt) {
    return "수유 기록 없음";
  }

  const elapsedMinutes = getElapsedMinutes(lastFeedAt, now) ?? 0;
  return formatDurationMinutes(elapsedMinutes);
}

function getFeedProgress(lastFeedAt: string | null, intervalMinutes: number, now: Date): number {
  const elapsedMinutes = getElapsedMinutes(lastFeedAt, now);

  if (elapsedMinutes === null) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((elapsedMinutes / intervalMinutes) * 100)));
}

function formatFeedCountdown(lastFeedAt: string | null, intervalMinutes: number, now: Date): string {
  if (!lastFeedAt) {
    return "첫 수유를 기록해 주세요";
  }

  const nextFeedAt = new Date(new Date(lastFeedAt).getTime() + intervalMinutes * 60000);
  const diffMinutes = Math.ceil((nextFeedAt.getTime() - now.getTime()) / 60000);

  if (diffMinutes === 0) {
    return "지금 수유 예정";
  }

  if (diffMinutes <= 0) {
    return `수유 시간이 ${formatDurationMinutes(Math.abs(diffMinutes))} 지났어요`;
  }

  return `${formatDurationMinutes(diffMinutes)} 후 수유 예정`;
}

function getFeedStatus(lastFeedAt: string | null, intervalMinutes: number, now: Date) {
  if (!lastFeedAt) {
    return "empty";
  }

  const elapsedMinutes = getElapsedMinutes(lastFeedAt, now) ?? 0;

  if (elapsedMinutes >= intervalMinutes) {
    return "overdue";
  }

  if (elapsedMinutes / intervalMinutes >= 0.7) {
    return "soon";
  }

  return "calm";
}

function GenderMark({ gender }: { gender: BabyProfile["gender"] }) {
  if (gender === "boy") {
    return (
      <svg className="baby-gender-icon boy" viewBox="0 0 16 16" aria-label="남아" role="img">
        <circle cx="6.25" cy="9.75" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 7L13 3M10.25 3H13V5.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className="baby-gender-icon girl" viewBox="0 0 16 16" aria-label="여아" role="img">
      <circle cx="8" cy="5.75" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9.5V14M5.8 11.8H10.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
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
  const feedProgress = getFeedProgress(summary.lastFeedAt, feedIntervalMinutes, now);
  const feedStatus = getFeedStatus(summary.lastFeedAt, feedIntervalMinutes, now);
  const poopAmountSummary = summary.lastPoopAmount
    ? poopAmountLabels[summary.lastPoopAmount]
    : "기록 없음";
  const poopColorLabel = summary.lastPoopColor ? poopColorLabels[summary.lastPoopColor] : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <section className="hero">
        <h1 className="baby-title baby-title-with-profile">
          <img
            className="baby-title-profile"
            src={defaultProfileImages[baby.gender]}
            alt={`${baby.gender === "boy" ? "남아" : "여아"} 기본 프로필`}
          />
          <span>{baby.name}</span>
        </h1>
        <p className="baby-meta">
          <span>{formatAge(baby.birthDate)}</span>
          <span aria-hidden="true">·</span>
          <GenderMark gender={baby.gender} />
        </p>
        {warning ? (
          <p className="hero-copy hero-warning">
            <span aria-hidden="true">!</span>
            수유기록이 4시간 넘게 없습니다.
          </p>
        ) : (
          <p className="hero-copy">오늘의 돌봄 기록을 한 화면에서 확인할 수 있습니다.</p>
        )}
        <div className={`status-card ${feedStatus}`}>
          <span>지금 상태 요약</span>
          <p>마지막 수유 후</p>
          <strong>{formatElapsedTitle(summary.lastFeedAt, now)}</strong>
          <em>{formatFeedCountdown(summary.lastFeedAt, feedIntervalMinutes, now)}</em>
          <div className="feed-progress" aria-label={`수유 텀 진행률 ${feedProgress}%`}>
            <i style={{ width: `${feedProgress}%` }} />
          </div>
          <div className="status-meta">
            <small>{formatDurationMinutes(feedIntervalMinutes)} 텀 기준</small>
            <select
              aria-label="수유 텀"
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
          </div>
        </div>
        <div className="hero-grid">
          <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("feed")}>
            <span>마지막 수유</span>
            <div className="metric-value">
              <strong>{summary.lastFeedAmountMl !== null ? `${summary.lastFeedAmountMl}ml` : "기록 없음"}</strong>
              <small>
                {summary.lastFeedAt ? `${formatTime(summary.lastFeedAt)} · ` : ""}
                {formatRelativeSince(summary.lastFeedAt, now)}
              </small>
            </div>
          </button>
          <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("poop")}>
            <span>마지막 대변</span>
            <div className="metric-value">
              <strong className="poop-summary-value">
                {summary.lastPoopColor ? (
                  <i
                    aria-label={poopColorLabel ?? undefined}
                    className={`poop-color-chip ${poopColorClasses[summary.lastPoopColor]}`}
                    role="img"
                  />
                ) : null}
                {poopAmountSummary}
              </strong>
              <small>
                {summary.lastPoopAt ? `${formatTime(summary.lastPoopAt)} · ` : ""}
                {formatRelativeSince(summary.lastPoopAt, now)}
              </small>
            </div>
          </button>
        </div>
      </section>
    </>
  );
}

interface AnalysisCardsProps {
  events: BabyEvent[];
  selectedDate: string;
  summary: DailyEventSummary;
  onDateChange: (date: string) => void;
}

interface DayTrend {
  dateKey: string;
  label: string;
  feedTotalMl: number;
  feedAverageIntervalMinutes: number | null;
  sleepMinutes: number;
}

const RECENT_TREND_DAYS = 7;

const poopColorShortLabels: Record<PoopColor, string> = {
  ocher: "황토",
  brown: "갈색",
  dark_brown: "진갈",
  green: "쑥색",
  red_orange: "다홍",
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEventsForDate(events: BabyEvent[], dateKey: string): BabyEvent[] {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = addDays(start, 1);

  return events.filter((event) => {
    const occurred = new Date(event.occurredAt).getTime();
    return occurred >= start.getTime() && occurred < end.getTime();
  });
}

function getSleepMinutes(events: BabyEvent[]): number {
  return events
    .filter((event) => event.eventType === "sleep")
    .reduce((total, event) => {
      if (!event.endedAt) {
        return total;
      }

      const start = new Date(event.occurredAt).getTime();
      const end = new Date(event.endedAt).getTime();
      return total + Math.max(0, Math.round((end - start) / 60000));
    }, 0);
}

function getFeedIntervals(feedEvents: BabyEvent[]): number[] {
  return feedEvents
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .reduce<number[]>((intervals, event, index, sortedEvents) => {
      if (index === 0) {
        return intervals;
      }

      const previous = new Date(sortedEvents[index - 1].occurredAt).getTime();
      const current = new Date(event.occurredAt).getTime();
      return [...intervals, Math.max(0, Math.round((current - previous) / 60000))];
    }, []);
}

function formatSignedMl(value: number): string {
  if (value === 0) {
    return "어제와 동일";
  }

  return `${value > 0 ? "+" : ""}${value}ml`;
}

function formatSignedMinutes(value: number): string {
  if (value === 0) {
    return "어제와 동일";
  }

  return `${value > 0 ? "+" : "-"}${formatDurationMinutes(Math.abs(value))}`;
}

function formatAverageInterval(minutes: number | null): string {
  return minutes === null ? "기록 부족" : formatDurationMinutes(minutes);
}

function formatCompactHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

function getInsight(summary: DailyEventSummary, averageInterval: number | null, sevenDaySleepAverage: number) {
  if (summary.feedCount >= 2 && averageInterval !== null && averageInterval >= 120 && averageInterval <= 240) {
    return {
      tone: "good",
      title: "수유 간격이 일정합니다",
      detail: `평균 ${formatDurationMinutes(averageInterval)} 간격으로 기록됐어요.`,
    };
  }

  if (sevenDaySleepAverage > 0 && summary.sleepMinutes < sevenDaySleepAverage - 60) {
    return {
      tone: "warn",
      title: "수면 시간이 평균보다 부족합니다",
      detail: `최근 평균보다 ${formatDurationMinutes(Math.round(sevenDaySleepAverage - summary.sleepMinutes))} 적어요.`,
    };
  }

  if (summary.feedCount === 0) {
    return {
      tone: "warn",
      title: "선택한 날짜에 수유 기록이 없습니다",
      detail: "수유 기록을 남기면 간격과 총량 추이를 볼 수 있어요.",
    };
  }

  return {
    tone: "neutral",
    title: "오늘 기록 흐름을 확인해 보세요",
    detail: "수유, 수면, 배변 패턴을 최근 7일과 비교해 보여드려요.",
  };
}

function formatAxisMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
  }

  return `${minutes}분`;
}

function ChartAxisLabels({ labels }: { labels: string[] }) {
  return (
    <div className="chart-y-axis" aria-hidden="true">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function TrendBars({
  data,
  valueKey,
  maxValue,
  tone,
  selectedDate,
}: {
  data: DayTrend[];
  valueKey: "feedTotalMl" | "sleepMinutes";
  maxValue: number;
  tone: "feed" | "sleep";
  selectedDate: string;
}) {
  const safeMax = Math.max(1, maxValue);

  return (
    <div className={`trend-bars ${data.length > 7 ? "dense" : ""}`}>
      {data.map((item) => (
        <div className={`trend-day ${item.dateKey === selectedDate ? "selected" : ""}`} key={item.dateKey}>
          <div className="trend-stack">
            <em>{valueKey === "feedTotalMl" ? `${item.feedTotalMl}ml` : formatCompactHours(item.sleepMinutes)}</em>
            <i
              className={`${tone}${tone === "sleep" && item.sleepMinutes >= 360 ? " strong" : ""}`}
              style={{ height: `${Math.max(item[valueKey] > 0 ? 8 : 3, (item[valueKey] / safeMax) * 100)}%` }}
              title={`${item.label || item.dateKey} ${
                valueKey === "feedTotalMl" ? `${item.feedTotalMl}ml` : formatDurationMinutes(item.sleepMinutes)
              }`}
            />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function FeedTimelineChart({ feeds }: { feeds: BabyEvent[] }) {
  const sortedFeeds = feeds
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  const maxAmount = Math.max(120, ...sortedFeeds.map((event) => event.amountMl ?? 0));

  return (
    <div className="chart-with-y-axis">
      <ChartAxisLabels labels={[`${maxAmount}ml`, `${Math.round(maxAmount / 2)}ml`, "0ml"]} />
      <div className="feed-timeline-chart">
        {sortedFeeds.length === 0 ? <p className="empty-copy">수유 기록이 없습니다.</p> : null}
        {sortedFeeds.map((event) => {
          const occurred = new Date(event.occurredAt);
          const left = ((occurred.getHours() * 60 + occurred.getMinutes()) / 1440) * 100;
          const height = Math.max(18, ((event.amountMl ?? 0) / maxAmount) * 78);

          return (
            <span
              className="feed-marker"
              key={event.id}
              style={{ left: `${left}%`, height: `${height}%` }}
              title={`${formatTime(event.occurredAt)} ${event.amountMl ?? 0}ml`}
            >
              <em>{event.amountMl ?? 0}ml</em>
            </span>
          );
        })}
        <div className="chart-axis">
          <span>0시</span>
          <span>6시</span>
          <span>12시</span>
          <span>18시</span>
          <span>24시</span>
        </div>
      </div>
    </div>
  );
}

function IntervalLineChart({
  data,
  maxInterval,
  selectedDate,
}: {
  data: DayTrend[];
  maxInterval: number;
  selectedDate: string;
}) {
  const safeMax = Math.max(1, maxInterval);
  const hasInterval = data.some((item) => item.feedAverageIntervalMinutes !== null);

  return (
    <div className="chart-with-y-axis">
      <ChartAxisLabels labels={[formatAxisMinutes(maxInterval), formatAxisMinutes(Math.round(maxInterval / 2)), "0분"]} />
      <div className={`interval-bars ${data.length > 7 ? "dense" : ""}`}>
        {!hasInterval ? <p className="empty-copy">간격 계산에는 날짜별 수유 기록 2개 이상이 필요합니다.</p> : null}
        {data.map((item) => {
          const interval = item.feedAverageIntervalMinutes;

          return (
          <div className={`interval-bar-item ${item.dateKey === selectedDate ? "selected" : ""}`} key={item.dateKey}>
            <div className="interval-bar-stack">
              <em>{interval === null ? "-" : formatAxisMinutes(interval)}</em>
              <i
                style={{ height: `${interval === null ? 3 : Math.max(8, (interval / safeMax) * 100)}%` }}
                title={interval === null ? `${item.label || item.dateKey} 기록 부족` : `${item.label || item.dateKey} ${formatDurationMinutes(interval)}`}
              />
            </div>
            <span>{item.label}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function PoopDistribution({ events }: { events: BabyEvent[] }) {
  const poopEvents = events.filter((event) => event.eventType === "poop" && event.poopColor);
  const counts = poopEvents.reduce<Record<PoopColor, number>>(
    (result, event) => {
      if (event.poopColor) {
        return { ...result, [event.poopColor]: result[event.poopColor] + 1 };
      }

      return result;
    },
    { ocher: 0, brown: 0, dark_brown: 0, green: 0, red_orange: 0 },
  );
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div className="poop-distribution">
      {Object.entries(counts).map(([color, count]) => (
        <div className="poop-bar-row" key={color}>
          <span>
            <i className={`poop-color-chip ${poopColorClasses[color as PoopColor]}`} />
            {poopColorShortLabels[color as PoopColor]}
          </span>
          <div>
            <i style={{ width: `${(count / maxCount) * 100}%` }} />
          </div>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}

export function AnalysisCards({ events, selectedDate, summary, onDateChange }: AnalysisCardsProps) {
  const selectedEvents = getEventsForDate(events, selectedDate);
  const feedEvents = selectedEvents.filter((event) => event.eventType === "feed");
  const poopEvents = selectedEvents.filter((event) => event.eventType === "poop");
  const intervals = getFeedIntervals(feedEvents);
  const averageInterval =
    intervals.length > 0 ? Math.round(intervals.reduce((total, value) => total + value, 0) / intervals.length) : null;
  const selectedStart = new Date(`${selectedDate}T00:00:00`);
  const yesterdayKey = toDateKey(addDays(selectedStart, -1));
  const yesterdaySummary = buildDailySummary(events, yesterdayKey);
  const trendData: DayTrend[] = Array.from({ length: RECENT_TREND_DAYS }, (_, index) => {
    const date = addDays(selectedStart, index - (RECENT_TREND_DAYS - 1));
    const dateKey = toDateKey(date);
    const dayEvents = getEventsForDate(events, dateKey);
    const dayFeedEvents = dayEvents.filter((event) => event.eventType === "feed");
    const dayIntervals = getFeedIntervals(dayFeedEvents);

    return {
      dateKey,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      feedTotalMl: dayFeedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0),
      feedAverageIntervalMinutes:
        dayIntervals.length > 0
          ? Math.round(dayIntervals.reduce((total, interval) => total + interval, 0) / dayIntervals.length)
          : null,
      sleepMinutes: getSleepMinutes(dayEvents),
    };
  });
  const sevenDaySleepAverage = Math.round(
    trendData.reduce((total, item) => total + item.sleepMinutes, 0) / trendData.length,
  );
  const maxSevenDayFeed = Math.max(120, ...trendData.map((item) => item.feedTotalMl));
  const maxTrendInterval = Math.max(240, ...trendData.map((item) => item.feedAverageIntervalMinutes ?? 0));
  const maxSevenDaySleep = Math.max(480, ...trendData.map((item) => item.sleepMinutes));
  const insight = getInsight(summary, averageInterval, sevenDaySleepAverage);
  const feedDiff = summary.feedTotalMl - yesterdaySummary.feedTotalMl;
  const sleepDiff = summary.sleepMinutes - yesterdaySummary.sleepMinutes;
  const hasEnoughFeedsForIntervalChart = feedEvents.length >= 2;

  return (
    <section className="analysis-stack">
      <section className="panel analysis-header">
        <div>
          <h2>오늘의 리듬</h2>
        </div>
        <input
          aria-label="분석 날짜"
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </section>

      <section className={`panel analysis-insight ${insight.tone}`}>
        <span>Insight</span>
        <strong>{insight.title}</strong>
        <p>{insight.detail}</p>
      </section>

      <section className="analysis-metric-grid">
        <article className="panel analysis-metric feed">
          <p>수유</p>
          <strong>{summary.feedTotalMl}ml</strong>
          <small>평균 간격 {formatAverageInterval(averageInterval)}</small>
          <em className={feedDiff >= 0 ? "up" : "down"}>{formatSignedMl(feedDiff)}</em>
        </article>
        <article className="panel analysis-metric sleep">
          <p>수면</p>
          <strong>{formatDurationMinutes(summary.sleepMinutes)}</strong>
          <small>{summary.sleepCount}회 기록</small>
          <em className={sleepDiff >= 0 ? "up" : "down"}>{formatSignedMinutes(sleepDiff)}</em>
        </article>
        <article className="panel analysis-metric poop">
          <p>배변</p>
          <strong>{summary.poopCount}회</strong>
          <small>소변 {summary.peeCount}회</small>
          <em>{poopEvents[0]?.poopColor ? poopColorLabels[poopEvents[0].poopColor] : "상태 기록 없음"}</em>
        </article>
      </section>

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">수유 타임라인</p>
            <h3>시간대별 수유량</h3>
          </div>
        </div>
        <FeedTimelineChart feeds={feedEvents} />
      </section>

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">수유 간격</p>
            <h3>날짜별 평균 간격</h3>
          </div>
        </div>
        {hasEnoughFeedsForIntervalChart ? (
          <IntervalLineChart data={trendData} maxInterval={maxTrendInterval} selectedDate={selectedDate} />
        ) : (
          <p className="empty-copy interval-empty-copy">
            선택한 날짜의 수유 기록이 2개 이상이면 날짜별 평균 간격을 확인할 수 있습니다.
          </p>
        )}
      </section>

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">최근 7일</p>
            <h3>수유량</h3>
          </div>
        </div>
        <div className="chart-with-y-axis">
          <ChartAxisLabels labels={[`${maxSevenDayFeed}ml`, `${Math.round(maxSevenDayFeed / 2)}ml`, "0ml"]} />
          <TrendBars
            data={trendData}
            valueKey="feedTotalMl"
            maxValue={maxSevenDayFeed}
            tone="feed"
            selectedDate={selectedDate}
          />
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">최근 7일</p>
            <h3>수면 시간</h3>
          </div>
        </div>
        <div className="chart-with-y-axis">
          <ChartAxisLabels
            labels={[formatAxisMinutes(maxSevenDaySleep), formatAxisMinutes(Math.round(maxSevenDaySleep / 2)), "0분"]}
          />
          <TrendBars
            data={trendData}
            valueKey="sleepMinutes"
            maxValue={maxSevenDaySleep}
            tone="sleep"
            selectedDate={selectedDate}
          />
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">배변 상태</p>
            <h3>색상 분포</h3>
          </div>
        </div>
        <PoopDistribution events={selectedEvents} />
      </section>

      <section className="panel analysis-action">
        <strong>해석이 필요한 날은 기록을 더 촘촘히 남겨보세요.</strong>
        <p>수유량, 대변 색상, 수면 종료 시간이 채워질수록 흐름을 더 정확히 볼 수 있습니다.</p>
      </section>
    </section>
  );
}
