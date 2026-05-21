import { useEffect, useState } from "react";
import { AdBanner } from "./ads/AdBanner";
import { ActivityShortcut } from "./activity/ActivityShortcut";
import { buildDailySummary, DailyEventSummary, EventSummary } from "../features/events/useEvents";
import { formatAge, formatDurationMinutes, formatTime } from "../lib/time";
import { BabyEvent, BabyProfile, EventType, PoopColor } from "../types";

interface SummaryCardsProps {
  baby: BabyProfile;
  events: BabyEvent[];
  feedIntervalMinutes: number;
  summary: EventSummary;
  onFeedIntervalChange: (minutes: number) => void;
  onQuickAdd: (eventType: EventType) => void;
  onWakeSleep: () => void;
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

const quickActions: Array<{ type: EventType; icon: string; label: string }> = [
  { type: "feed", icon: "/icons/feeding.svg", label: "수유" },
  { type: "sleep", icon: "/icons/sleeping.svg", label: "수면" },
  { type: "meal", icon: "/icons/babyfood.svg", label: "이유식" },
  { type: "diaper", icon: "/icons/diaper.svg", label: "기저귀" },
  { type: "play", icon: "/icons/play.svg", label: "놀이" },
  { type: "bath", icon: "/icons/bath.svg", label: "목욕" },
  { type: "medicine", icon: "/icons/pill.svg", label: "약" },
  { type: "temperature", icon: "/icons/thermometer.svg", label: "체온" },
];

const feedIntervalPresets = [180, 210, 240, 270, 300];

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
  return `${formatDurationMinutes(elapsedMinutes)} 전`;
}

function formatMealElapsedTitle(lastMealAt: string | null, now: Date): string {
  if (!lastMealAt) {
    return "이유식 기록 없음";
  }

  const elapsedMinutes = getElapsedMinutes(lastMealAt, now) ?? 0;
  return `${formatDurationMinutes(elapsedMinutes)} 전`;
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

function getSleepStatusLabel(activeSleepStartedAt: string | null) {
  return activeSleepStartedAt ? "수면 중" : "깨어있음";
}

function getMealTimerStatus(elapsedMinutes: number | null): "soon" | null {
  if (elapsedMinutes === null) {
    return null;
  }

  if (elapsedMinutes >= 180) {
    return "soon";
  }

  return null;
}

function formatTodayMealNameCounts(events: BabyEvent[], now: Date): string | null {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const counts = events.reduce<Map<string, number>>((mealCounts, event) => {
    if (event.eventType !== "meal" || new Date(event.occurredAt).getTime() < todayStart.getTime()) {
      return mealCounts;
    }

    const mealName = event.mealName?.trim();
    if (!mealName) {
      return mealCounts;
    }

    mealCounts.set(mealName, (mealCounts.get(mealName) ?? 0) + 1);
    return mealCounts;
  }, new Map<string, number>());

  if (counts.size === 0) {
    return null;
  }

  return Array.from(counts.entries())
    .map(([mealName, count]) => `${mealName} ${count}회`)
    .join(", ");
}

function formatFeedIntervalPreset(minutes: number): string {
  if (minutes % 60 === 0) {
    return `${minutes / 60}시간`;
  }

  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function FeedIntervalPresetLabel({ minutes }: { minutes: number }) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return <span>{hours}시간</span>;
  }

  return (
    <>
      <span>{hours}시간</span>
      <span>{remainingMinutes}분</span>
    </>
  );
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

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  events,
  feedIntervalMinutes,
  summary,
  onFeedIntervalChange,
  onQuickAdd,
  onWakeSleep,
}: SummaryCardsProps) {
  const [now, setNow] = useState(new Date());
  const [isExpandedSummaryOpen, setIsExpandedSummaryOpen] = useState(false);
  const isMealMode = events.some((event) => event.eventType === "meal");
  const feedProgress = getFeedProgress(summary.lastFeedAt, feedIntervalMinutes, now);
  const feedStatus = getFeedStatus(summary.lastFeedAt, feedIntervalMinutes, now);
  const warning = !isMealMode && feedStatus === "overdue";
  const lastFeedTitle = formatElapsedTitle(summary.lastFeedAt, now);
  const lastMealTitle = formatMealElapsedTitle(summary.lastMealAt, now);
  const mealTimerStatus = isMealMode ? getMealTimerStatus(getElapsedMinutes(summary.lastMealAt, now)) : null;
  const lastFeedDescription = summary.lastFeedAt
    ? `${formatTime(summary.lastFeedAt)} 마지막 수유`
    : "수유 기록을 남기면 다음 예측이 표시됩니다.";
  const lastMealDescription = summary.lastMealAt
    ? `${formatTime(summary.lastMealAt)} 마지막 이유식`
    : "이유식 기록을 남기면 오늘의 흐름이 표시됩니다.";
  const nextFeedCopy = formatFeedCountdown(summary.lastFeedAt, feedIntervalMinutes, now);
  const visibleFeedIntervalPresets = feedIntervalPresets.includes(feedIntervalMinutes)
    ? feedIntervalPresets
    : [...feedIntervalPresets, feedIntervalMinutes].sort((left, right) => left - right);
  const primarySummaryLabel = isMealMode ? "이유식량" : "수유량";
  const primarySummaryValue = isMealMode
    ? summary.todayMealTotalG > 0
      ? `${summary.todayMealTotalG}g`
      : "아직 기록이 없어요"
    : summary.todayFeedTotalMl > 0
      ? `${summary.todayFeedTotalMl}ml`
      : "아직 기록이 없어요";
  const sleepDurationLabel = summary.todaySleepMinutes > 0 ? formatDurationMinutes(summary.todaySleepMinutes) : "아직 기록이 없어요";
  const primarySummaryDetail = isMealMode
    ? summary.todayMealCount > 0
      ? formatTodayMealNameCounts(events, now) ?? `오늘 ${summary.todayMealCount}회 기록`
      : "기록을 더 쌓는 중"
    : summary.todayFeedCount > 0
      ? `오늘 ${summary.todayFeedCount}회 기록`
      : "아직 기록이 없어요";
  const sleepStatusLabel = getSleepStatusLabel(summary.activeSleepStartedAt);
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
            수유기록이 {formatDurationMinutes(feedIntervalMinutes)} 기준을 넘었습니다.
          </p>
        ) : null}
        <div className={`status-card ${isMealMode ? `meal${mealTimerStatus ? ` meal-timer-${mealTimerStatus}` : ""}` : feedStatus}`}>
          <div className={`status-card-section status-current${isMealMode && mealTimerStatus ? ` meal-timer-${mealTimerStatus}` : ""}`}>
            <div className="status-card-heading">
              <span>{isMealMode ? "마지막 이유식" : "마지막 수유"}</span>
            </div>
            <strong>{isMealMode ? lastMealTitle : lastFeedTitle}</strong>
            <small>{isMealMode ? lastMealDescription : lastFeedDescription}</small>
          </div>

          {!isMealMode ? (
            <div className="status-card-section status-next">
              <div className="status-card-heading">
                <span>다음 수유 예측</span>
                <small>{formatDurationMinutes(feedIntervalMinutes)} 기준</small>
              </div>
              <strong className="next-feed-copy">{nextFeedCopy}</strong>
              <div className="feed-progress" aria-label={`수유 텀 진행률 ${feedProgress}%`}>
                <i style={{ width: `${feedProgress}%` }} />
              </div>
              <small className="status-progress-label">평균 수유 간격 기준</small>
              <div className="feed-interval-chips" aria-label="수유 간격 기준">
                {visibleFeedIntervalPresets.map((minutes) => (
                  <button
                    aria-pressed={feedIntervalMinutes === minutes}
                    className={feedIntervalMinutes === minutes ? "active" : ""}
                    key={minutes}
                    type="button"
                    onClick={() => onFeedIntervalChange(minutes)}
                  >
                    <FeedIntervalPresetLabel minutes={minutes} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="summary-grid today-primary-summary-grid">
          <div className="metric-card metric-display metric-display-left">
            <span>{primarySummaryLabel}</span>
            <div className="metric-value">
              <strong>{primarySummaryValue}</strong>
            </div>
            <small>{primarySummaryDetail}</small>
          </div>
          <div className="metric-card metric-display metric-display-left">
            <span>수면시간</span>
            <div className="metric-value">
              <strong>{sleepDurationLabel}</strong>
            </div>
            <div className="sleep-status-row">
              <span className="sleep-status-chip">{sleepStatusLabel}</span>
              {summary.activeSleepStartedAt ? (
                <button className="sleep-wake-button" type="button" onClick={onWakeSleep}>
                  깨우기
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="summary-toggle-row">
          <div className="summary-toggle-copy">
            <button
              aria-expanded={isExpandedSummaryOpen}
              className="summary-toggle-button"
              type="button"
              onClick={() => setIsExpandedSummaryOpen((current) => !current)}
            >
              {isExpandedSummaryOpen ? "추가 기록 숨기기 ▲" : "추가 기록 보기 ▼"}
            </button>
            <span>{isMealMode ? "수유 · 기저귀 · 약 · 체온 · 놀이 · 목욕" : "기저귀 · 약 · 체온 · 놀이 · 목욕 · 이유식"}</span>
          </div>
        </div>
        {isExpandedSummaryOpen ? (
          <div className="summary-grid today-summary-grid today-extra-summary-grid">
            {isMealMode ? (
              <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("feed")}>
                <span>수유량</span>
                <div className="metric-value">
                  <strong>{summary.todayFeedTotalMl}ml</strong>
                </div>
              </button>
            ) : (
              <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("diaper")}>
                <span>기저귀</span>
                <div className="metric-value">
                  <strong>{summary.todayDiaperCount}회</strong>
                </div>
              </button>
            )}
            {isMealMode ? (
              <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("diaper")}>
                <span>기저귀</span>
                <div className="metric-value">
                  <strong>{summary.todayDiaperCount}회</strong>
                </div>
              </button>
            ) : null}
            <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("medicine")}>
              <span>약</span>
              <div className="metric-value">
                <strong>{summary.todayMedicineCount}회</strong>
              </div>
            </button>
            <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("temperature")}>
              <span>체온</span>
              <div className="metric-value">
                <strong>{summary.latestTemperatureC ? `${summary.latestTemperatureC.toFixed(1)}도` : "-"}</strong>
              </div>
            </button>
            <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("play")}>
              <span>놀이</span>
              <div className="metric-value">
                <strong>{formatDurationMinutes(summary.todayPlayMinutes)}</strong>
              </div>
            </button>
            <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("bath")}>
              <span>목욕</span>
              <div className="metric-value">
                <strong>{summary.todayBathCount}회</strong>
              </div>
            </button>
            {!isMealMode ? (
              <button className="metric-card metric-button" type="button" onClick={() => onQuickAdd("meal")}>
                <span>이유식</span>
                <div className="metric-value">
                  <strong>{summary.todayMealCount}회</strong>
                </div>
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      <AdBanner placement="home-bottom" />
      <section className="panel home-quick-section" aria-label="기록">
        <div className="section-heading compact-heading">
          <div>
            <h2>기록</h2>
          </div>
        </div>
        <div className="home-quick-grid">
          {quickActions.map((action) => (
            <ActivityShortcut
              icon={action.icon}
              key={action.type}
              label={action.label}
              variant="quick"
              onClick={() => onQuickAdd(action.type)}
            />
          ))}
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
  mealTotalG: number;
  mealAverageIntervalMinutes: number | null;
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

function getEventsForDate(events: BabyEvent[], dateKey: string): BabyEvent[] {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = addDays(start, 1);

  return events.filter((event) => {
    const occurred = new Date(event.occurredAt).getTime();
    return occurred >= start.getTime() && occurred < end.getTime();
  });
}

function getFirstEventDateKey(events: BabyEvent[], eventType: "feed" | "meal"): string | null {
  const matchingEvents = events.filter((event) => event.eventType === eventType);

  if (matchingEvents.length === 0) {
    return null;
  }

  return matchingEvents.reduce<string>((earliestDateKey, event) => {
    const currentDateKey = toDateKey(new Date(event.occurredAt));
    return currentDateKey < earliestDateKey ? currentDateKey : earliestDateKey;
  }, toDateKey(new Date(matchingEvents[0].occurredAt)));
}

function getSleepMinutes(events: BabyEvent[], now: Date): number {
  return events
    .filter((event) => event.eventType === "sleep")
    .reduce((total, event) => {
      const start = new Date(event.occurredAt).getTime();
      const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();
      return total + Math.max(0, Math.round((end - start) / 60000));
    }, 0);
}

function getPlayMinutes(events: BabyEvent[], now: Date): number {
  return events
    .filter((event) => event.eventType === "play")
    .reduce((total, event) => {
      const start = new Date(event.occurredAt).getTime();
      const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();
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

function formatSignedAmount(value: number, unit: "ml" | "g"): string {
  if (value === 0) {
    return "어제와 동일";
  }

  return `${value > 0 ? "+" : ""}${value}${unit}`;
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

function getMealInsight(summary: DailyEventSummary, averageInterval: number | null, sevenDaySleepAverage: number) {
  if (summary.mealCount >= 2 && averageInterval !== null && averageInterval >= 60 && averageInterval <= 240) {
    return {
      tone: "good",
      title: "이유식 간격이 안정적입니다",
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

  if (summary.mealCount === 0) {
    return {
      tone: "warn",
      title: "선택한 날짜에 이유식 기록이 없습니다",
      detail: "이유식 기록을 남기면 간격과 총량 추이를 볼 수 있어요.",
    };
  }

  return {
    tone: "neutral",
    title: "오늘 이유식 흐름을 확인해 보세요",
    detail: "이유식, 수면, 배변 패턴을 최근 7일과 비교해 보여드려요.",
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
  valueKey: "feedTotalMl" | "mealTotalG" | "sleepMinutes";
  maxValue: number;
  tone: "feed" | "meal" | "sleep";
  selectedDate: string;
}) {
  const safeMax = Math.max(1, maxValue);

  return (
    <div className={`trend-bars ${data.length > 7 ? "dense" : ""}`}>
      {data.map((item) => (
        <div className={`trend-day ${item.dateKey === selectedDate ? "selected" : ""}`} key={item.dateKey}>
          <div className="trend-stack">
            <em>
              {valueKey === "feedTotalMl"
                ? `${item.feedTotalMl}ml`
                : valueKey === "mealTotalG"
                  ? `${item.mealTotalG}g`
                  : formatCompactHours(item.sleepMinutes)}
            </em>
            <i
              className={`${tone}${tone === "sleep" && item.sleepMinutes >= 360 ? " strong" : ""}`}
              style={{ height: `${Math.max(item[valueKey] > 0 ? 8 : 3, (item[valueKey] / safeMax) * 100)}%` }}
              title={`${item.label || item.dateKey} ${
                valueKey === "feedTotalMl"
                  ? `${item.feedTotalMl}ml`
                  : valueKey === "mealTotalG"
                    ? `${item.mealTotalG}g`
                    : formatDurationMinutes(item.sleepMinutes)
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

function MealTimelineChart({ meals }: { meals: BabyEvent[] }) {
  const sortedMeals = meals
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  const maxAmount = Math.max(60, ...sortedMeals.map((event) => event.mealAmountG ?? 0));

  return (
    <div className="chart-with-y-axis">
      <ChartAxisLabels labels={[`${maxAmount}g`, `${Math.round(maxAmount / 2)}g`, "0g"]} />
      <div className="feed-timeline-chart">
        {sortedMeals.length === 0 ? <p className="empty-copy">이유식 기록이 없습니다.</p> : null}
        {sortedMeals.map((event) => {
          const occurred = new Date(event.occurredAt);
          const left = ((occurred.getHours() * 60 + occurred.getMinutes()) / 1440) * 100;
          const height = Math.max(18, ((event.mealAmountG ?? 0) / maxAmount) * 78);

          return (
            <span
              className="feed-marker meal-marker"
              key={event.id}
              style={{ left: `${left}%`, height: `${height}%` }}
              title={`${formatTime(event.occurredAt)} ${event.mealAmountG ?? 0}g`}
            >
              <em>{event.mealAmountG ?? 0}g</em>
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
  valueKey,
  emptyMessage,
}: {
  data: DayTrend[];
  maxInterval: number;
  selectedDate: string;
  valueKey: "feedAverageIntervalMinutes" | "mealAverageIntervalMinutes";
  emptyMessage: string;
}) {
  const safeMax = Math.max(1, maxInterval);
  const hasInterval = data.some((item) => item[valueKey] !== null);

  return (
    <div className="chart-with-y-axis">
      <ChartAxisLabels labels={[formatAxisMinutes(maxInterval), formatAxisMinutes(Math.round(maxInterval / 2)), "0분"]} />
      <div className={`interval-bars ${data.length > 7 ? "dense" : ""}`}>
        {!hasInterval ? <p className="empty-copy">{emptyMessage}</p> : null}
        {data.map((item) => {
          const interval = item[valueKey];

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
  const poopEvents = events.filter(
    (event) => (event.eventType === "poop" || event.eventType === "diaper") && event.poopColor,
  );
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
  const [now, setNow] = useState(new Date());
  const selectedEvents = getEventsForDate(events, selectedDate);
  const todayKey = toDateKey(now);
  const isTodaySelected = selectedDate === todayKey;
  const feedEvents = selectedEvents.filter((event) => event.eventType === "feed");
  const mealEvents = selectedEvents.filter((event) => event.eventType === "meal");
  const poopEvents = selectedEvents.filter((event) => (event.eventType === "poop" || event.eventType === "diaper") && event.poopColor);
  const intervals = getFeedIntervals(feedEvents);
  const mealIntervals = getFeedIntervals(mealEvents);
  const averageInterval =
    intervals.length > 0 ? Math.round(intervals.reduce((total, value) => total + value, 0) / intervals.length) : null;
  const averageMealInterval =
    mealIntervals.length > 0 ? Math.round(mealIntervals.reduce((total, value) => total + value, 0) / mealIntervals.length) : null;
  const selectedStart = new Date(`${selectedDate}T00:00:00`);
  const yesterdayKey = toDateKey(addDays(selectedStart, -1));
  const yesterdaySummary = buildDailySummary(events, yesterdayKey);
  const firstMealDateKey = getFirstEventDateKey(events, "meal");
  const isMealMode = firstMealDateKey !== null && selectedDate >= firstMealDateKey;
  const rhythmLabel = isMealMode ? "이유식" : "수유";
  const rhythmUnit = isMealMode ? "g" : "ml";
  const rhythmTotal = isMealMode ? summary.mealTotalG : summary.feedTotalMl;
  const rhythmAverageInterval = isMealMode ? averageMealInterval : averageInterval;
  const rhythmDiff = isMealMode ? summary.mealTotalG - yesterdaySummary.mealTotalG : summary.feedTotalMl - yesterdaySummary.feedTotalMl;
  const trendData: DayTrend[] = Array.from({ length: RECENT_TREND_DAYS }, (_, index) => {
    const date = addDays(selectedStart, index - (RECENT_TREND_DAYS - 1));
    const dateKey = toDateKey(date);
    const dayEvents = getEventsForDate(events, dateKey);
    const dayFeedEvents = dayEvents.filter((event) => event.eventType === "feed");
    const dayMealEvents = dayEvents.filter((event) => event.eventType === "meal");
    const dayFeedIntervals = getFeedIntervals(dayFeedEvents);
    const dayMealIntervals = getFeedIntervals(dayMealEvents);

    return {
      dateKey,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      feedTotalMl: dayFeedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0),
      feedAverageIntervalMinutes:
        dayFeedIntervals.length > 0
          ? Math.round(dayFeedIntervals.reduce((total, interval) => total + interval, 0) / dayFeedIntervals.length)
          : null,
      mealTotalG: dayMealEvents.reduce((total, event) => total + (event.mealAmountG ?? 0), 0),
      mealAverageIntervalMinutes:
        dayMealIntervals.length > 0
          ? Math.round(dayMealIntervals.reduce((total, interval) => total + interval, 0) / dayMealIntervals.length)
          : null,
      sleepMinutes: getSleepMinutes(dayEvents, now),
    };
  });
  const sevenDaySleepAverage = Math.round(
    trendData.reduce((total, item) => total + item.sleepMinutes, 0) / trendData.length,
  );
  const maxSevenDayFeed = Math.max(120, ...trendData.map((item) => item.feedTotalMl));
  const maxSevenDayMeal = Math.max(60, ...trendData.map((item) => item.mealTotalG));
  const maxTrendInterval = Math.max(240, ...trendData.map((item) => item.feedAverageIntervalMinutes ?? 0));
  const maxMealTrendInterval = Math.max(240, ...trendData.map((item) => item.mealAverageIntervalMinutes ?? 0));
  const maxSevenDaySleep = Math.max(480, ...trendData.map((item) => item.sleepMinutes));
  const displaySummary = isTodaySelected
    ? {
        ...summary,
        sleepMinutes: getSleepMinutes(selectedEvents, now),
        playMinutes: getPlayMinutes(selectedEvents, now),
      }
    : summary;
  const insight = isMealMode
    ? getMealInsight(displaySummary, averageMealInterval, sevenDaySleepAverage)
    : getInsight(displaySummary, averageInterval, sevenDaySleepAverage);
  const sleepDiff = displaySummary.sleepMinutes - yesterdaySummary.sleepMinutes;
  const hasEnoughFeedsForIntervalChart = feedEvents.length >= 2;
  const hasEnoughMealsForIntervalChart = mealEvents.length >= 2;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="analysis-stack">
      <section className="panel analysis-header">
        <div>
          <h2>{isMealMode ? "오늘의 이유식 리듬" : "오늘의 리듬"}</h2>
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
        <article className={`panel analysis-metric ${isMealMode ? "meal" : "feed"}`}>
          <p>{rhythmLabel}</p>
          <strong>{rhythmTotal}{rhythmUnit}</strong>
          <small>평균 간격 {formatAverageInterval(rhythmAverageInterval)}</small>
          <em className={rhythmDiff >= 0 ? "up" : "down"}>{formatSignedAmount(rhythmDiff, rhythmUnit)}</em>
        </article>
        <article className="panel analysis-metric sleep">
          <p>수면</p>
          <strong>{formatDurationMinutes(displaySummary.sleepMinutes)}</strong>
          <small>{displaySummary.sleepCount}회 기록</small>
          <em className={sleepDiff >= 0 ? "up" : "down"}>{formatSignedMinutes(sleepDiff)}</em>
        </article>
        <article className="panel analysis-metric poop">
          <p>기저귀</p>
          <strong>{summary.diaperCount}회</strong>
          <small>소변/대변 통합</small>
          <em>{poopEvents[0]?.poopColor ? poopColorLabels[poopEvents[0].poopColor] : "상태 기록 없음"}</em>
        </article>
      </section>

      <AdBanner placement="analysis-bottom" />

      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">{isMealMode ? "이유식 타임라인" : "수유 타임라인"}</p>
            <h3>{isMealMode ? "시간대별 이유식량" : "시간대별 수유량"}</h3>
          </div>
        </div>
        {isMealMode ? <MealTimelineChart meals={mealEvents} /> : <FeedTimelineChart feeds={feedEvents} />}
      </section>
      <section className="panel chart-panel">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">{isMealMode ? "이유식 간격" : "수유 간격"}</p>
            <h3>날짜별 평균 간격</h3>
          </div>
        </div>
        {isMealMode ? (
          hasEnoughMealsForIntervalChart ? (
            <IntervalLineChart
              data={trendData}
              maxInterval={maxMealTrendInterval}
              selectedDate={selectedDate}
              valueKey="mealAverageIntervalMinutes"
              emptyMessage="선택한 날짜의 이유식 기록이 2개 이상이면 날짜별 평균 간격을 확인할 수 있습니다."
            />
          ) : (
            <p className="empty-copy interval-empty-copy">
              선택한 날짜의 이유식 기록이 2개 이상이면 날짜별 평균 간격을 확인할 수 있습니다.
            </p>
          )
        ) : hasEnoughFeedsForIntervalChart ? (
          <IntervalLineChart
            data={trendData}
            maxInterval={maxTrendInterval}
            selectedDate={selectedDate}
            valueKey="feedAverageIntervalMinutes"
            emptyMessage="선택한 날짜의 수유 기록이 2개 이상이면 날짜별 평균 간격을 확인할 수 있습니다."
          />
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
            <h3>{isMealMode ? "이유식량" : "수유량"}</h3>
          </div>
        </div>
        <div className="chart-with-y-axis">
          <ChartAxisLabels
            labels={
              isMealMode
                ? [`${maxSevenDayMeal}g`, `${Math.round(maxSevenDayMeal / 2)}g`, "0g"]
                : [`${maxSevenDayFeed}ml`, `${Math.round(maxSevenDayFeed / 2)}ml`, "0ml"]
            }
          />
          <TrendBars
            data={trendData}
            valueKey={isMealMode ? "mealTotalG" : "feedTotalMl"}
            maxValue={isMealMode ? maxSevenDayMeal : maxSevenDayFeed}
            tone={isMealMode ? "meal" : "feed"}
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
        <p>
          {isMealMode
            ? "이유식량, 식재료 반응, 수면 종료 시간이 채워질수록 이유식 흐름을 더 정확히 볼 수 있습니다."
            : "수유량, 대변 색상, 수면 종료 시간이 채워질수록 흐름을 더 정확히 볼 수 있습니다."}
        </p>
      </section>
    </section>
  );
}
