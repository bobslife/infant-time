import { useEffect, useRef, useState } from "react";
import { AdBanner } from "./ads/AdBanner";
import { ActivityShortcut } from "./activity/ActivityShortcut";
import { DateNavigator } from "./DateNavigator";
import { buildDailySummary, DailyEventSummary, EventSummary } from "../features/events/useEvents";
import { formatAge, formatDurationMinutes, formatTime } from "../lib/time";
import { BabyEvent, BabyProfile, EventType, FeedingMethod, PoopColor } from "../types";

interface SummaryCardsProps {
  baby: BabyProfile;
  events: BabyEvent[];
  feedIntervalMinutes: number;
  summary: EventSummary;
  onFeedIntervalChange: (minutes: number) => void;
  onQuickAdd: (eventType: EventType, feedingMethod?: FeedingMethod) => void;
  onWakeSleep: () => void;
  onEndPlay: () => void;
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

const quickActions: Array<{
  id: string;
  type: EventType;
  feedingMethod?: FeedingMethod;
  icon: string;
  label: string;
}> = [
  { id: "breast", type: "feed", feedingMethod: "breast", icon: "/icons/breastfeed.svg", label: "모유" },
  { id: "bottle", type: "feed", feedingMethod: "bottle", icon: "/icons/feeding.svg", label: "분유" },
  { id: "meal", type: "meal", icon: "/icons/babyfood.svg", label: "이유식" },
  { id: "sleep", type: "sleep", icon: "/icons/sleeping.svg", label: "수면" },
  { id: "diaper", type: "diaper", icon: "/icons/diaper.svg", label: "기저귀" },
  { id: "play", type: "play", icon: "/icons/play.svg", label: "놀이" },
  { id: "bath", type: "bath", icon: "/icons/bath.svg", label: "목욕" },
  { id: "medicine", type: "medicine", icon: "/icons/pill.svg", label: "약" },
  { id: "temperature", type: "temperature", icon: "/icons/thermometer.svg", label: "체온" },
];

function matchesQuickAction(
  event: BabyEvent,
  action: (typeof quickActions)[number],
): boolean {
  if (action.type === "feed") {
    return event.eventType === "feed" && (event.feedingMethod ?? "bottle") === action.feedingMethod;
  }

  if (action.type === "diaper") {
    return event.eventType === "diaper" || event.eventType === "pee" || event.eventType === "poop";
  }

  return event.eventType === action.type;
}

function sortQuickActionsByUsage(events: BabyEvent[]) {
  const recentEvents = [...events]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 30);

  if (recentEvents.length < 4) {
    return quickActions;
  }

  const scored = quickActions.map((action, defaultIndex) => {
    const score = recentEvents.reduce((total, event, eventIndex) => {
      if (!matchesQuickAction(event, action)) {
        return total;
      }

      return total + Math.max(1, 30 - eventIndex);
    }, 0);

    return { action, defaultIndex, score };
  });
  const promoted = scored
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.defaultIndex - right.defaultIndex)
    .slice(0, 4);
  const promotedIds = new Set(promoted.map((item) => item.action.id));

  return [
    ...promoted.map((item) => item.action),
    ...quickActions.filter((action) => !promotedIds.has(action.id)),
  ];
}

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
  onEndPlay,
}: SummaryCardsProps) {
  const [now, setNow] = useState(new Date());
  const [isExpandedSummaryOpen, setIsExpandedSummaryOpen] = useState(false);
  const [isQuickScrollAtEnd, setIsQuickScrollAtEnd] = useState(false);
  const quickScrollRef = useRef<HTMLDivElement | null>(null);
  const ongoingPlay = events.find((event) => event.eventType === "play" && !event.endedAt) ?? null;
  const orderedQuickActions = sortQuickActionsByUsage(events);
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
  const quickActionItems = orderedQuickActions.map((action) => {
    if (action.type === "sleep" && summary.activeSleepStartedAt) {
      return {
        ...action,
        label: "수면 종료",
        badge: formatDurationMinutes(getElapsedMinutes(summary.activeSleepStartedAt, now) ?? 0),
        onClick: onWakeSleep,
      };
    }

    if (action.type === "play" && ongoingPlay) {
      return {
        ...action,
        label: "놀이 종료",
        badge: formatDurationMinutes(getElapsedMinutes(ongoingPlay.occurredAt, now) ?? 0),
        onClick: onEndPlay,
      };
    }

    return {
      ...action,
      badge: undefined,
      onClick: () => onQuickAdd(action.type, action.feedingMethod),
    };
  });
  const lastMealDescription = summary.lastMealAt
    ? `${formatTime(summary.lastMealAt)} 마지막 이유식`
    : "이유식 기록을 남기면 오늘의 흐름이 표시됩니다.";
  const lastFeedDetail =
    summary.lastFeedingMethod === "breast"
      ? `모유 · 왼쪽 ${summary.lastBreastLeftMinutes ?? 0}분 · 오른쪽 ${summary.lastBreastRightMinutes ?? 0}분`
      : `분유 · ${summary.lastFeedAmountMl ?? 0}ml`;
  const nextFeedCopy = formatFeedCountdown(summary.lastFeedAt, feedIntervalMinutes, now);
  const visibleFeedIntervalPresets = feedIntervalPresets.includes(feedIntervalMinutes)
    ? feedIntervalPresets
    : [...feedIntervalPresets, feedIntervalMinutes].sort((left, right) => left - right);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const todayFeedEvents = events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return event.eventType === "feed" && occurredAt >= todayStart && occurredAt < tomorrowStart;
  });
  const hasTodayBottleFeed = todayFeedEvents.some(
    (event) => (event.feedingMethod ?? "bottle") === "bottle",
  );
  const hasTodayBreastFeed = todayFeedEvents.some((event) => event.feedingMethod === "breast");
  const primarySummaryLabel = isMealMode ? "이유식량" : "오늘 수유";
  const primarySummaryValue = summary.todayMealTotalG > 0
    ? `${summary.todayMealTotalG}g`
    : "아직 기록이 없어요";
  const sleepDurationLabel = summary.todaySleepMinutes > 0 ? formatDurationMinutes(summary.todaySleepMinutes) : "아직 기록이 없어요";
  const primarySummaryDetail = isMealMode
    ? summary.todayMealCount > 0
      ? formatTodayMealNameCounts(events, now) ?? `오늘 ${summary.todayMealCount}회 기록`
      : "기록을 더 쌓는 중"
    : summary.todayFeedCount > 0
      ? `총 ${summary.todayFeedCount}회 기록`
      : "아직 기록이 없어요";
  const sleepStatusLabel = getSleepStatusLabel(summary.activeSleepStartedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const scrollElement = quickScrollRef.current;
    if (!scrollElement) {
      return;
    }

    const updateScrollEnd = () => {
      const remaining = scrollElement.scrollWidth - scrollElement.clientWidth - scrollElement.scrollLeft;
      setIsQuickScrollAtEnd(remaining <= 4);
    };

    updateScrollEnd();
    window.addEventListener("resize", updateScrollEnd);
    return () => window.removeEventListener("resize", updateScrollEnd);
  }, [quickActionItems.length]);

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
            <small>
              {isMealMode
                ? lastMealDescription
                : summary.lastFeedAt
                  ? `${lastFeedDescription} · ${lastFeedDetail}`
                  : lastFeedDescription}
            </small>
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
              {isMealMode ? (
                <strong>{primarySummaryValue}</strong>
              ) : hasTodayBottleFeed || hasTodayBreastFeed ? (
                <strong className="today-feeding-value">
                  {hasTodayBottleFeed ? <span>분유 {summary.todayFeedTotalMl}ml</span> : null}
                  {hasTodayBreastFeed ? <span>모유 {summary.todayBreastMinutes}분</span> : null}
                </strong>
              ) : (
                <strong>아직 기록이 없어요</strong>
              )}
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
                <span>분유</span>
                <div className="metric-value">
                  <strong>분유 {summary.todayFeedTotalMl}ml</strong>
                </div>
                <small>모유 {summary.todayBreastMinutes}분 · {summary.todayFeedCount}회</small>
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
      <section className="panel home-quick-section" aria-label="기록">
        <div className="section-heading compact-heading">
          <div>
            <h2>기록</h2>
          </div>
        </div>
        <div className={`home-quick-wrap${isQuickScrollAtEnd ? " scroll-end" : ""}`}>
          <div
            className="home-quick-grid"
            ref={quickScrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              const remaining = element.scrollWidth - element.clientWidth - element.scrollLeft;
              setIsQuickScrollAtEnd(remaining <= 4);
            }}
          >
            {quickActionItems.map((action) => (
              <ActivityShortcut
                icon={action.icon}
                key={action.id}
                label={action.label}
                badge={action.badge}
                variant="quick"
                onClick={action.onClick}
              />
            ))}
          </div>
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
  onEditEvent: (event: BabyEvent) => void;
  onQuickAdd: (eventType: EventType, feedingMethod?: FeedingMethod) => void;
  onViewEventInPattern: (event: BabyEvent) => void;
}

interface DayTrend {
  dateKey: string;
  label: string;
  feedTotalMl: number;
  breastMinutes: number;
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

function getEventFeedbackLabelForAnalysis(event: BabyEvent): string {
  if (event.eventType === "feed") {
    return (event.feedingMethod ?? "bottle") === "breast" ? "모유" : "분유";
  }

  const labels: Record<EventType, string> = {
    feed: "수유",
    sleep: "수면",
    diaper: "기저귀",
    medicine: "약",
    temperature: "체온",
    meal: "이유식",
    memo: "메모",
    pee: "소변",
    poop: "대변",
    bath: "목욕",
    play: "놀이",
  };

  return labels[event.eventType];
}

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
      focus: "feed" as const,
    };
  }

  if (sevenDaySleepAverage > 0 && summary.sleepMinutes < sevenDaySleepAverage - 60) {
    return {
      tone: "warn",
      title: "수면 시간이 평균보다 부족합니다",
      detail: `최근 평균보다 ${formatDurationMinutes(Math.round(sevenDaySleepAverage - summary.sleepMinutes))} 적어요.`,
      focus: "sleep" as const,
    };
  }

  if (summary.feedCount === 0) {
    return {
      tone: "warn",
      title: "선택한 날짜에 수유 기록이 없습니다",
      detail: "수유 기록을 남기면 간격과 총량 추이를 볼 수 있어요.",
      focus: "none" as const,
    };
  }

  return {
    tone: "neutral",
    title: "최근 흐름과 크게 다르지 않아요",
    detail: "현재 기록만으로는 두드러진 변화를 단정하지 않았어요.",
    focus: "none" as const,
  };
}

function getMealInsight(summary: DailyEventSummary, averageInterval: number | null, sevenDaySleepAverage: number) {
  if (summary.mealCount >= 2 && averageInterval !== null && averageInterval >= 60 && averageInterval <= 240) {
    return {
      tone: "good",
      title: "이유식 간격이 안정적입니다",
      detail: `평균 ${formatDurationMinutes(averageInterval)} 간격으로 기록됐어요.`,
      focus: "meal" as const,
    };
  }

  if (sevenDaySleepAverage > 0 && summary.sleepMinutes < sevenDaySleepAverage - 60) {
    return {
      tone: "warn",
      title: "수면 시간이 평균보다 부족합니다",
      detail: `최근 평균보다 ${formatDurationMinutes(Math.round(sevenDaySleepAverage - summary.sleepMinutes))} 적어요.`,
      focus: "sleep" as const,
    };
  }

  if (summary.mealCount === 0) {
    return {
      tone: "warn",
      title: "선택한 날짜에 이유식 기록이 없습니다",
      detail: "이유식 기록을 남기면 간격과 총량 추이를 볼 수 있어요.",
      focus: "none" as const,
    };
  }

  return {
    tone: "neutral",
    title: "최근 흐름과 크게 다르지 않아요",
    detail: "현재 기록만으로는 두드러진 변화를 단정하지 않았어요.",
    focus: "none" as const,
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
  valueKey: "feedTotalMl" | "breastMinutes" | "mealTotalG" | "sleepMinutes";
  maxValue: number;
  tone: "feed" | "breast" | "meal" | "sleep";
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
                : valueKey === "breastMinutes"
                  ? `${item.breastMinutes}분`
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
                  : valueKey === "breastMinutes"
                    ? `${item.breastMinutes}분`
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
  const bottleFeeds = sortedFeeds.filter((event) => (event.feedingMethod ?? "bottle") === "bottle");
  const maxAmount = Math.max(120, ...bottleFeeds.map((event) => event.amountMl ?? 0));

  return (
    <div className="chart-with-y-axis">
      <ChartAxisLabels labels={[`${maxAmount}ml`, `${Math.round(maxAmount / 2)}ml`, "0ml"]} />
      <div className="feed-timeline-chart">
        {sortedFeeds.length === 0 ? <p className="empty-copy">수유 기록이 없습니다.</p> : null}
        {sortedFeeds.map((event) => {
          const occurred = new Date(event.occurredAt);
          const left = ((occurred.getHours() * 60 + occurred.getMinutes()) / 1440) * 100;
          const isBreast = (event.feedingMethod ?? "bottle") === "breast";
          const breastMinutes = (event.breastLeftMinutes ?? 0) + (event.breastRightMinutes ?? 0);
          const height = Math.max(18, ((event.amountMl ?? 0) / maxAmount) * 78);

          return (
            <span
              className={`feed-marker${isBreast ? " breast-marker" : ""}`}
              key={event.id}
              style={{ left: `${left}%`, height: isBreast ? "16px" : `${height}%` }}
              title={
                isBreast
                  ? `${formatTime(event.occurredAt)} 모유 왼쪽 ${event.breastLeftMinutes ?? 0}분 오른쪽 ${event.breastRightMinutes ?? 0}분`
                  : `${formatTime(event.occurredAt)} 분유 ${event.amountMl ?? 0}ml`
              }
            >
              <em>{isBreast ? `모유 ${breastMinutes}분` : `${event.amountMl ?? 0}ml`}</em>
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

function AnalysisDataRequirement({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="analysis-data-requirement">
      <p>{message}</p>
      <button type="button" onClick={onAction}>{actionLabel}</button>
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

export function AnalysisCards({
  events,
  selectedDate,
  summary,
  onDateChange,
  onEditEvent,
  onQuickAdd,
  onViewEventInPattern,
}: AnalysisCardsProps) {
  const [now, setNow] = useState(new Date());
  const [detailSection, setDetailSection] = useState<"intake" | "sleep" | "diaper">("intake");
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
      feedTotalMl: dayFeedEvents.reduce(
        (total, event) =>
          total + ((event.feedingMethod ?? "bottle") === "bottle" ? event.amountMl ?? 0 : 0),
        0,
      ),
      breastMinutes: dayFeedEvents.reduce(
        (total, event) =>
          total +
          ((event.feedingMethod ?? "bottle") === "breast"
            ? (event.breastLeftMinutes ?? 0) + (event.breastRightMinutes ?? 0)
            : 0),
        0,
      ),
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
  const recordedSleepValues = trendData
    .filter((item) => item.dateKey !== selectedDate)
    .map((item) => item.sleepMinutes)
    .filter((minutes) => minutes > 0);
  const sevenDaySleepAverage = recordedSleepValues.length
    ? Math.round(recordedSleepValues.reduce((total, minutes) => total + minutes, 0) / recordedSleepValues.length)
    : 0;
  const maxSevenDayFeed = Math.max(120, ...trendData.map((item) => item.feedTotalMl));
  const maxSevenDayBreast = Math.max(30, ...trendData.map((item) => item.breastMinutes));
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
  const breastDiff = displaySummary.breastMinutes - yesterdaySummary.breastMinutes;
  const hasEnoughFeedsForIntervalChart = feedEvents.length >= 2;
  const hasEnoughMealsForIntervalChart = mealEvents.length >= 2;
  const recordedTrendDays = trendData.filter(
    (item) =>
      item.feedTotalMl > 0 ||
      item.breastMinutes > 0 ||
      item.mealTotalG > 0 ||
      item.sleepMinutes > 0,
  );
  const feedingTrendDays = trendData.filter((item) =>
    isMealMode ? item.mealTotalG > 0 : item.feedTotalMl > 0 || item.breastMinutes > 0,
  );
  const sleepTrendDays = trendData.filter((item) => item.sleepMinutes > 0);
  const bottleTrendDays = trendData.filter((item) => item.feedTotalMl > 0);
  const breastTrendDays = trendData.filter((item) => item.breastMinutes > 0);
  const mealTrendDays = trendData.filter((item) => item.mealTotalG > 0);
  const averageRecordedFeedMl = feedingTrendDays.length
    ? Math.round(feedingTrendDays.reduce((total, item) => total + item.feedTotalMl, 0) / feedingTrendDays.length)
    : 0;
  const averageRecordedBreastMinutes = feedingTrendDays.length
    ? Math.round(feedingTrendDays.reduce((total, item) => total + item.breastMinutes, 0) / feedingTrendDays.length)
    : 0;
  const averageRecordedMealG = feedingTrendDays.length
    ? Math.round(feedingTrendDays.reduce((total, item) => total + item.mealTotalG, 0) / feedingTrendDays.length)
    : 0;
  const averageRecordedSleepMinutes = sleepTrendDays.length
    ? Math.round(sleepTrendDays.reduce((total, item) => total + item.sleepMinutes, 0) / sleepTrendDays.length)
    : 0;
  const sortedFeedEvents = [...feedEvents].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );
  const representativeFeedGap =
    averageInterval === null
      ? null
      : sortedFeedEvents.slice(1).reduce<{
          previous: BabyEvent;
          current: BabyEvent;
          minutes: number;
        } | null>((closest, current, index) => {
          const previous = sortedFeedEvents[index];
          const minutes = Math.max(
            0,
            Math.round(
              (new Date(current.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 60000,
            ),
          );
          return !closest || Math.abs(minutes - averageInterval) < Math.abs(closest.minutes - averageInterval)
            ? { previous, current, minutes }
            : closest;
        }, null);
  const sortedMealEvents = [...mealEvents].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );
  const representativeMealGap =
    averageMealInterval === null
      ? null
      : sortedMealEvents.slice(1).reduce<{
          previous: BabyEvent;
          current: BabyEvent;
          minutes: number;
        } | null>((closest, current, index) => {
          const previous = sortedMealEvents[index];
          const minutes = Math.max(
            0,
            Math.round(
              (new Date(current.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 60000,
            ),
          );
          return !closest ||
            Math.abs(minutes - averageMealInterval) < Math.abs(closest.minutes - averageMealInterval)
            ? { previous, current, minutes }
            : closest;
        }, null);
  const longestSleep = selectedEvents
    .filter((event) => event.eventType === "sleep")
    .map((event) => ({
      event,
      minutes: Math.max(
        0,
        Math.round(
          ((event.endedAt ? new Date(event.endedAt).getTime() : now.getTime()) -
            new Date(event.occurredAt).getTime()) /
            60000,
        ),
      ),
    }))
    .sort((left, right) => right.minutes - left.minutes)[0] ?? null;
  const evidenceCopy =
    insight.focus === "feed" && representativeFeedGap && averageInterval !== null
      ? `평균 ${formatDurationMinutes(averageInterval)} · ${formatTime(
          representativeFeedGap.previous.occurredAt,
        )}~${formatTime(representativeFeedGap.current.occurredAt)} ${formatDurationMinutes(
          representativeFeedGap.minutes,
        )} 간격`
      : insight.focus === "meal" && representativeMealGap && averageMealInterval !== null
        ? `평균 ${formatDurationMinutes(averageMealInterval)} · ${formatTime(
            representativeMealGap.previous.occurredAt,
          )}~${formatTime(representativeMealGap.current.occurredAt)} ${formatDurationMinutes(
            representativeMealGap.minutes,
          )} 간격`
        : insight.focus === "sleep" && longestSleep
          ? `총 수면 ${formatDurationMinutes(displaySummary.sleepMinutes)} · ${displaySummary.sleepCount}회 중 가장 긴 수면 ${formatDurationMinutes(
              longestSleep.minutes,
            )}`
          : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (selectedEvents.length === 0) {
    return (
      <section className="analysis-stack">
        <section className="panel analysis-header">
          <div>
            <h2>하루 요약</h2>
          </div>
          <DateNavigator ariaLabel="분석 날짜" selectedDate={selectedDate} onDateChange={onDateChange} />
        </section>
        <section className="panel data-empty-state">
          <strong>이날은 아직 기록이 없어요</strong>
          <p>수유나 수면 한 건만 남겨도 시간 흐름이 보이기 시작해요. 선택한 날짜로 바로 기록할 수 있어요.</p>
          <div className="data-empty-actions">
            <button type="button" onClick={() => onQuickAdd("feed")}>수유 기록</button>
            <button type="button" onClick={() => onQuickAdd("sleep")}>수면 기록</button>
          </div>
        </section>
      </section>
    );
  }

  if (selectedEvents.length === 1) {
    const onlyEvent = selectedEvents[0];
    const nextEventType: EventType = onlyEvent.eventType === "sleep" ? "feed" : "sleep";

    return (
      <section className="analysis-stack">
        <section className="panel analysis-header">
          <div>
            <h2>하루 요약</h2>
          </div>
          <DateNavigator ariaLabel="분석 날짜" selectedDate={selectedDate} onDateChange={onDateChange} />
        </section>
        <section className="panel sparse-day-summary">
          <span>현재 1개 기록</span>
          <strong>{formatTime(onlyEvent.occurredAt)} · {getEventFeedbackLabelForAnalysis(onlyEvent)}</strong>
          <p>한 건의 기록만으로 하루 전체 흐름을 단정하지 않아요. 수유와 수면이 함께 쌓이면 먹고 자는 간격을 비교할 수 있어요.</p>
          <div>
            <button type="button" onClick={() => onEditEvent(onlyEvent)}>이 기록 수정</button>
            <button type="button" onClick={() => onViewEventInPattern(onlyEvent)}>리듬에서 보기</button>
            <button type="button" onClick={() => onQuickAdd(nextEventType)}>
              {nextEventType === "feed" ? "수유 추가" : "수면 추가"}
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="analysis-stack">
      <section className="panel analysis-header">
        <DateNavigator ariaLabel="분석 날짜" selectedDate={selectedDate} onDateChange={onDateChange} />
      </section>

      <section className={`panel analysis-insight ${insight.tone}`}>
        <span>Insight</span>
        <strong>{insight.title}</strong>
        <p>{insight.detail}</p>
        {evidenceCopy ? (
          <div className="analysis-evidence">
            <span>근거 기록</span>
            <strong>{evidenceCopy}</strong>
          </div>
        ) : null}
      </section>

      <section className="panel weekly-overview" aria-label="최근 7일 요약">
        <div className="weekly-overview-heading">
          <div>
            <span>최근 7일 한눈에</span>
            <strong>{recordedTrendDays.length}일 기록</strong>
          </div>
          <small>기록한 날 기준 평균</small>
        </div>
        {recordedTrendDays.length >= 2 ? (
          <div className="weekly-overview-grid">
            <div>
              <span>{isMealMode ? "이유식" : "수유"}</span>
              <strong>
                {isMealMode
                  ? `${averageRecordedMealG}g`
                  : `분유 ${averageRecordedFeedMl}ml`}
              </strong>
              {!isMealMode ? <small>모유 {averageRecordedBreastMinutes}분</small> : null}
            </div>
            <div>
              <span>수면</span>
              <strong>{formatDurationMinutes(averageRecordedSleepMinutes)}</strong>
              <small>{sleepTrendDays.length}일 기록 기준</small>
            </div>
          </div>
        ) : (
          <p>이틀 이상 기록하면 하루 수유와 수면이 평소 흐름과 비슷한지 비교해 드려요.</p>
        )}
      </section>

      <section className="analysis-metric-grid">
        {isMealMode ? (
          <>
            <article className="panel analysis-metric meal">
              <p>이유식</p>
              <strong>{summary.mealTotalG}g</strong>
              <small>
                {summary.mealCount}회 · 수유 {summary.feedCount}회 병행
              </small>
              <em className={rhythmDiff >= 0 ? "up" : "down"}>
                {formatSignedAmount(rhythmDiff, "g")}
              </em>
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
          </>
        ) : (
          <>
            <article className="panel analysis-metric feed">
              <p>총 수유</p>
              <strong>{summary.feedCount}회</strong>
              <small>평균 간격 {formatAverageInterval(averageInterval)}</small>
              <em>{summary.feedCount > 0 ? "분유 + 모유" : "기록 없음"}</em>
            </article>
            <article className="panel analysis-metric bottle">
              <p>분유 총량</p>
              <strong>{summary.feedTotalMl}ml</strong>
              <small>모유 시간과 별도 집계</small>
              <em className={rhythmDiff >= 0 ? "up" : "down"}>
                {formatSignedAmount(rhythmDiff, "ml")}
              </em>
            </article>
            <article className="panel analysis-metric breast">
              <p>모유 시간</p>
              <strong>{summary.breastMinutes}분</strong>
              <small>좌우 수유 시간 합계</small>
              <em className={breastDiff >= 0 ? "up" : "down"}>{formatSignedMinutes(breastDiff)}</em>
            </article>
          </>
        )}
      </section>

      <nav className="analysis-detail-switch" aria-label="분석 상세 항목">
        {[
          { id: "intake" as const, label: "섭취" },
          { id: "sleep" as const, label: "수면" },
          { id: "diaper" as const, label: "기저귀" },
        ].map((item) => (
          <button
            aria-pressed={detailSection === item.id}
            className={detailSection === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => setDetailSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {detailSection === "intake" ? (
        <div className="analysis-detail-stack">
          <section className="panel chart-panel">
            <div className="chart-heading">
              <div>
                <p className="eyebrow">{isMealMode ? "이유식 타임라인" : "수유 타임라인"}</p>
                <h3>{isMealMode ? "시간대별 이유식량" : "분유량과 모유 시간"}</h3>
              </div>
            </div>
            {isMealMode ? (
              mealEvents.length > 0 ? (
                <MealTimelineChart meals={mealEvents} />
              ) : (
                <AnalysisDataRequirement
                  actionLabel="이유식 기록"
                  message="이유식 기록을 한 건 남기면 먹은 시간과 양을 타임라인으로 볼 수 있어요."
                  onAction={() => onQuickAdd("meal")}
                />
              )
            ) : feedEvents.length > 0 ? (
              <FeedTimelineChart feeds={feedEvents} />
            ) : (
              <AnalysisDataRequirement
                actionLabel="수유 기록"
                message="수유 기록을 한 건 남기면 먹은 시간과 양을 타임라인으로 볼 수 있어요."
                onAction={() => onQuickAdd("feed")}
              />
            )}
          </section>

          <section className="panel chart-panel">
            <div className="chart-heading">
              <div>
                <p className="eyebrow">{isMealMode ? "이유식 간격" : "통합 수유 간격"}</p>
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
                  emptyMessage="선택한 날짜의 이유식 기록이 2개 이상이면 평균 간격을 확인할 수 있습니다."
                />
              ) : (
                <AnalysisDataRequirement
                  actionLabel="이유식 한 번 더 기록"
                  message="선택한 날짜의 이유식 기록이 2개 이상이면 평균 간격을 확인할 수 있어요."
                  onAction={() => onQuickAdd("meal")}
                />
              )
            ) : hasEnoughFeedsForIntervalChart ? (
              <IntervalLineChart
                data={trendData}
                maxInterval={maxTrendInterval}
                selectedDate={selectedDate}
                valueKey="feedAverageIntervalMinutes"
                emptyMessage="분유와 모유를 합쳐 2개 이상 기록하면 평균 간격을 확인할 수 있습니다."
              />
            ) : (
              <AnalysisDataRequirement
                actionLabel="수유 한 번 더 기록"
                message="분유와 모유를 합쳐 2개 이상 기록하면 평균 간격을 확인할 수 있어요."
                onAction={() => onQuickAdd("feed")}
              />
            )}
          </section>

          {isMealMode ? (
            <>
              <section className="panel analysis-companion-feed">
                <span>병행 수유</span>
                <strong>
                  {summary.feedCount}회 · 분유 {summary.feedTotalMl}ml · 모유 {summary.breastMinutes}분
                </strong>
              </section>
              <section className="panel chart-panel">
                <div className="chart-heading">
                  <div>
                    <p className="eyebrow">최근 7일</p>
                    <h3>이유식량</h3>
                  </div>
                </div>
                {mealTrendDays.length >= 2 ? (
                  <div className="chart-with-y-axis">
                    <ChartAxisLabels labels={[`${maxSevenDayMeal}g`, `${Math.round(maxSevenDayMeal / 2)}g`, "0g"]} />
                    <TrendBars data={trendData} valueKey="mealTotalG" maxValue={maxSevenDayMeal} tone="meal" selectedDate={selectedDate} />
                  </div>
                ) : (
                  <AnalysisDataRequirement
                    actionLabel="이유식 기록"
                    message="최근 7일 중 이틀 이상 이유식을 기록하면 날짜별 변화를 비교할 수 있어요."
                    onAction={() => onQuickAdd("meal")}
                  />
                )}
              </section>
            </>
          ) : (
            <div className="analysis-trend-grid">
              <section className="panel chart-panel">
                <div className="chart-heading">
                  <div>
                    <p className="eyebrow">최근 7일</p>
                    <h3>분유량</h3>
                  </div>
                </div>
                {bottleTrendDays.length >= 2 ? (
                  <div className="chart-with-y-axis">
                    <ChartAxisLabels labels={[`${maxSevenDayFeed}ml`, `${Math.round(maxSevenDayFeed / 2)}ml`, "0ml"]} />
                    <TrendBars data={trendData} valueKey="feedTotalMl" maxValue={maxSevenDayFeed} tone="feed" selectedDate={selectedDate} />
                  </div>
                ) : (
                  <AnalysisDataRequirement
                    actionLabel="분유 기록"
                    message="최근 7일 중 이틀 이상 분유를 기록하면 하루 총량 변화를 비교할 수 있어요."
                    onAction={() => onQuickAdd("feed", "bottle")}
                  />
                )}
              </section>
              <section className="panel chart-panel">
                <div className="chart-heading">
                  <div>
                    <p className="eyebrow">최근 7일</p>
                    <h3>모유 시간</h3>
                  </div>
                </div>
                {breastTrendDays.length >= 2 ? (
                  <div className="chart-with-y-axis">
                    <ChartAxisLabels labels={[`${maxSevenDayBreast}분`, `${Math.round(maxSevenDayBreast / 2)}분`, "0분"]} />
                    <TrendBars data={trendData} valueKey="breastMinutes" maxValue={maxSevenDayBreast} tone="breast" selectedDate={selectedDate} />
                  </div>
                ) : (
                  <AnalysisDataRequirement
                    actionLabel="모유 기록"
                    message="최근 7일 중 이틀 이상 모유 시간을 기록하면 날짜별 변화를 비교할 수 있어요."
                    onAction={() => onQuickAdd("feed", "breast")}
                  />
                )}
              </section>
            </div>
          )}
        </div>
      ) : null}

      {detailSection === "sleep" ? (
        <section className="panel chart-panel">
          <div className="chart-heading">
            <div>
              <p className="eyebrow">최근 7일</p>
              <h3>수면 시간</h3>
            </div>
          </div>
          {sleepTrendDays.length >= 2 ? (
            <div className="chart-with-y-axis">
              <ChartAxisLabels labels={[formatAxisMinutes(maxSevenDaySleep), formatAxisMinutes(Math.round(maxSevenDaySleep / 2)), "0분"]} />
              <TrendBars data={trendData} valueKey="sleepMinutes" maxValue={maxSevenDaySleep} tone="sleep" selectedDate={selectedDate} />
            </div>
          ) : (
            <AnalysisDataRequirement
              actionLabel="수면 기록"
              message="최근 7일 중 이틀 이상 수면을 기록하면 평소 수면 시간과 비교할 수 있어요."
              onAction={() => onQuickAdd("sleep")}
            />
          )}
        </section>
      ) : null}

      {detailSection === "diaper" ? (
        <div className="analysis-detail-stack">
          <section className="panel analysis-diaper-summary">
            <span>선택한 날짜</span>
            <strong>기저귀 {summary.diaperCount}회</strong>
            <small>소변 {summary.peeCount}회 · 대변 {summary.poopCount}회</small>
          </section>
          <section className="panel chart-panel">
            <div className="chart-heading">
              <div>
                <p className="eyebrow">배변 상태</p>
                <h3>색상 분포</h3>
              </div>
            </div>
            {poopEvents.length > 0 ? (
              <PoopDistribution events={selectedEvents} />
            ) : (
              <AnalysisDataRequirement
                actionLabel="기저귀 기록"
                message="대변 색상을 한 번 기록하면 선택한 날의 배변 상태를 정리해 보여드려요."
                onAction={() => onQuickAdd("diaper")}
              />
            )}
          </section>
        </div>
      ) : null}

      <section className="panel analysis-action">
        <strong>해석이 필요한 날은 기록을 더 촘촘히 남겨보세요.</strong>
        <p>
          {isMealMode
            ? "이유식량, 식재료 반응, 수면 종료 시간이 채워질수록 이유식 흐름을 더 정확히 볼 수 있습니다."
            : "수유량, 대변 색상, 수면 종료 시간이 채워질수록 흐름을 더 정확히 볼 수 있습니다."}
        </p>
      </section>
      <AdBanner placement="analysis-bottom" />
    </section>
  );
}
