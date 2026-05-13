import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { DailyEventSummary } from "../features/events/useEvents";
import { formatDurationMinutes, formatTime } from "../lib/time";
import { BabyEvent } from "../types";

type PatternTypeKey =
  | "empty"
  | "feed"
  | "sleep"
  | "diaper"
  | "medicine"
  | "temperature"
  | "meal"
  | "play"
  | "bath"
  | "memo";

interface PatternVisual {
  key: PatternTypeKey;
  label: string;
  color: string;
  softColor: string;
  priority: number;
}

type RhythmRingKey = "sleep" | "feed" | "diaper" | "secondary";

interface RhythmRing {
  key: RhythmRingKey;
  label: string;
  radius: number;
  strokeWidth: number;
  color: string;
  emptyColor: string;
}

interface RhythmSegment {
  id: string;
  key: PatternTypeKey;
  label: string;
  color: string;
  softColor: string;
  ringKey: RhythmRingKey;
  radius: number;
  strokeWidth: number;
  startMinute: number;
  endMinute: number;
  title: string;
  detail: string;
  laneOffset: number;
}

interface RhythmEvent {
  id: string;
  key: PatternTypeKey;
  label: string;
  color: string;
  softColor: string;
  detail: string;
  ringKey: RhythmRingKey;
  radius: number;
  strokeWidth: number;
  startMinute: number;
  endMinute: number;
  lane: number;
  title: string;
}

interface PatternCardsProps {
  events: BabyEvent[];
  selectedDate: string;
  summary: DailyEventSummary;
  onDateChange: (date: string) => void;
}

const rhythmTypes: Record<PatternTypeKey, PatternVisual> = {
  empty: { key: "empty", label: "빈 시간", color: "#F1F5F9", softColor: "#F8FAFC", priority: 0 },
  feed: { key: "feed", label: "수유", color: "#4F8CFF", softColor: "#EAF2FF", priority: 70 },
  sleep: { key: "sleep", label: "수면", color: "#A78BFA", softColor: "#F1ECFF", priority: 90 },
  diaper: { key: "diaper", label: "기저귀", color: "#F59E0B", softColor: "#FFF4D8", priority: 50 },
  medicine: { key: "medicine", label: "약", color: "#EF5DA8", softColor: "#FDE7F2", priority: 65 },
  temperature: { key: "temperature", label: "체온", color: "#14B8A6", softColor: "#E4F8F5", priority: 45 },
  meal: { key: "meal", label: "이유식", color: "#22C55E", softColor: "#E7F8EE", priority: 60 },
  play: { key: "play", label: "놀이", color: "#FB7185", softColor: "#FFE8EC", priority: 80 },
  bath: { key: "bath", label: "목욕", color: "#38BDF8", softColor: "#E7F6FE", priority: 55 },
  memo: { key: "memo", label: "메모", color: "#94A3B8", softColor: "#F1F5F9", priority: 30 },
};

const rhythmRings: Record<RhythmRingKey, RhythmRing> = {
  sleep: {
    key: "sleep",
    label: "수면",
    radius: 124,
    strokeWidth: 20,
    color: rhythmTypes.sleep.color,
    emptyColor: rhythmTypes.empty.color,
  },
  feed: {
    key: "feed",
    label: "수유",
    radius: 98,
    strokeWidth: 16,
    color: rhythmTypes.feed.color,
    emptyColor: rhythmTypes.empty.color,
  },
  diaper: {
    key: "diaper",
    label: "기저귀",
    radius: 76,
    strokeWidth: 12,
    color: rhythmTypes.diaper.color,
    emptyColor: rhythmTypes.empty.color,
  },
  secondary: {
    key: "secondary",
    label: "세부 기록",
    radius: 52,
    strokeWidth: 8,
    color: rhythmTypes.memo.color,
    emptyColor: rhythmTypes.empty.color,
  },
};

const secondaryLaneOffsets: Record<PatternTypeKey, number> = {
  empty: 0,
  feed: 0,
  sleep: 0,
  diaper: 0,
  medicine: -12,
  temperature: -6,
  meal: 0,
  play: 6,
  bath: 12,
  memo: 18,
};

const eventMinimumDurations: Record<PatternTypeKey, number> = {
  empty: 10,
  feed: 18,
  sleep: 20,
  diaper: 10,
  medicine: 10,
  temperature: 8,
  meal: 14,
  play: 20,
  bath: 12,
  memo: 8,
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
    if (occurred >= start.getTime() && occurred < end.getTime()) {
      return true;
    }

    if (!event.endedAt) {
      return false;
    }

    const endedAt = new Date(event.endedAt).getTime();
    return occurred < end.getTime() && endedAt > start.getTime();
  });
}

function getPatternType(event: BabyEvent): PatternVisual {
  if (event.eventType === "pee" || event.eventType === "poop" || event.eventType === "diaper") {
    return rhythmTypes.diaper;
  }

  if (event.eventType === "temperature") {
    return rhythmTypes.temperature;
  }

  if (event.eventType in rhythmTypes) {
    return rhythmTypes[event.eventType as PatternTypeKey];
  }

  return rhythmTypes.memo;
}

function getDateRange(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = addDays(start, 1);
  return { start, end };
}

function getMinimumDurationMinutes(event: BabyEvent): number {
  return eventMinimumDurations[getPatternType(event).key];
}

function getVisibleRangeForDate(
  event: BabyEvent,
  startTime: number,
  endTime: number,
): { startMinute: number; endMinute: number } | null {
  const eventStart = new Date(event.occurredAt).getTime();
  const rawEnd =
    event.endedAt && (event.eventType === "sleep" || event.eventType === "play")
      ? new Date(event.endedAt).getTime()
      : eventStart + getMinimumDurationMinutes(event) * 60000;

  const visibleStart = Math.max(eventStart, startTime);
  const visibleEnd = Math.min(rawEnd, endTime);

  if (visibleEnd <= visibleStart) {
    return null;
  }

  return {
    startMinute: Math.max(0, Math.min(1439, Math.floor((visibleStart - startTime) / 60000))),
    endMinute: Math.max(
      1,
      Math.min(1440, Math.ceil((visibleEnd - startTime) / 60000)),
    ),
  };
}

function buildRhythmEvents(events: BabyEvent[], _dateKey: string): RhythmEvent[] {
  const { start, end } = getDateRange(_dateKey);
  const startTime = start.getTime();
  const endTime = end.getTime();

  return events
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .flatMap((event, index) => {
      const type = getPatternType(event);
      const range = getVisibleRangeForDate(event, startTime, endTime);

      if (!range) {
        return [];
      }

      const duration = Math.max(1, range.endMinute - range.startMinute);
      const isPrimary = type.key === "sleep" || type.key === "feed" || type.key === "diaper";
      const ringKey: RhythmRingKey =
        type.key === "sleep"
          ? "sleep"
          : type.key === "feed"
            ? "feed"
            : type.key === "diaper"
              ? "diaper"
              : "secondary";
      const ring = rhythmRings[ringKey];
      const laneOffset = isPrimary ? 0 : secondaryLaneOffsets[type.key];
      const radius = ring.radius + laneOffset;
      const strokeWidth = isPrimary ? ring.strokeWidth : 5;
      const detail = buildEventDetail(event, type.key, duration);
      const title = `${formatTime(event.occurredAt)} ${detail}`;

      return [{
        id: event.id,
        key: type.key,
        label: type.label,
        color: type.color,
        softColor: type.softColor,
        detail,
        ringKey,
        radius,
        strokeWidth,
        startMinute: range.startMinute,
        endMinute: range.endMinute,
        lane: index % 3,
        title,
      }];
    });
}

function buildEventDetail(event: BabyEvent, typeKey: PatternTypeKey, durationMinutes: number): string {
  switch (typeKey) {
    case "feed":
      return `${event.amountMl ?? 0}ml`;
    case "sleep":
      return `${formatDurationMinutes(durationMinutes)} 수면`;
    case "diaper":
      return event.diaperType === "dirty"
        ? "대변"
        : event.diaperType === "both"
          ? "둘다"
          : "소변";
    case "medicine":
      return event.medicineName?.trim()
        ? event.medicineDose?.trim()
          ? `${event.medicineName.trim()} · ${event.medicineDose.trim()}`
          : event.medicineName.trim()
        : "약";
    case "temperature":
      return `${(event.temperatureC ?? 0).toFixed(1)}도`;
    case "meal":
      return event.mealName?.trim()
        ? event.mealAmountG
          ? `${event.mealName.trim()} · ${event.mealAmountG}g`
          : event.mealName.trim()
        : "이유식";
    case "play":
      return event.note?.trim()
        ? `${event.note.trim()} · ${formatDurationMinutes(durationMinutes)}`
        : `${formatDurationMinutes(durationMinutes)} 놀이`;
    case "bath":
      return "목욕";
    case "memo":
      return event.note?.trim() || "메모";
    default:
      return `${typeKey}`;
  }
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleInRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX: number, centerY: number, radius: number, startMinute: number, endMinute: number): string {
  const startAngle = (startMinute / 1440) * 360;
  const endAngle = (endMinute / 1440) * 360;
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endMinute - startMinute > 720 ? 1 : 0;

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function getDurationMinutes(events: BabyEvent[], type: "sleep" | "play", now: Date): number {
  return events
    .filter((event) => event.eventType === type)
    .reduce((total, event) => {
      const start = new Date(event.occurredAt).getTime();
      const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();
      return total + Math.max(0, Math.round((end - start) / 60000));
    }, 0);
}

function getRhythmInsight(events: BabyEvent[], summary: DailyEventSummary, now: Date): string {
  if (events.length === 0) {
    return "첫 기록을 남기면 하루 리듬이 표시됩니다.";
  }

  const morningFeeds = events.filter((event) => {
    const hour = new Date(event.occurredAt).getHours();
    return event.eventType === "feed" && hour >= 6 && hour < 12;
  }).length;
  if (morningFeeds >= 2) {
    return "오전 시간대 수유가 집중되어 있어요.";
  }

  const nightSleepMinutes = events
    .filter((event) => event.eventType === "sleep")
    .reduce((total, event) => {
      const startHour = new Date(event.occurredAt).getHours();
      return startHour < 6 || startHour >= 21 ? total + getDurationMinutes([event], "sleep", now) : total;
    }, 0);
  if (nightSleepMinutes >= 180) {
    return "새벽과 밤 수면 리듬이 길게 이어지고 있어요.";
  }

  const afternoonActivity = events.filter((event) => {
    const hour = new Date(event.occurredAt).getHours();
    return (event.eventType === "play" || event.eventType === "meal") && hour >= 12 && hour < 18;
  }).length;
  if (afternoonActivity === 0 && events.length >= 3) {
    return "오후 활동 기록이 적어요.";
  }

  if (summary.playMinutes > 0) {
    return `놀이 시간이 ${formatDurationMinutes(summary.playMinutes)} 기록됐어요.`;
  }

  return "기록이 쌓일수록 아기의 하루 반복성이 더 선명해집니다.";
}

export function PatternCards({ events, selectedDate, summary, onDateChange }: PatternCardsProps) {
  const [now, setNow] = useState(new Date());
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const todayKey = toDateKey(now);
  const isTodaySelected = selectedDate === todayKey;
  const displaySummary = isTodaySelected
    ? {
        ...summary,
        sleepMinutes: getDurationMinutes(selectedEvents, "sleep", now),
        playMinutes: getDurationMinutes(selectedEvents, "play", now),
      }
    : summary;
  const rhythmSegments = useMemo(() => buildRhythmEvents(selectedEvents, selectedDate), [selectedDate, selectedEvents]);
  const activeTypes = useMemo(
    () =>
      Array.from(
        new Map(
          rhythmSegments.map((event) => [
            event.key,
            {
              key: event.key,
              label: event.label,
              color: event.color,
            },
          ]),
        ).values(),
      ),
    [rhythmSegments],
  );
  const totalPatternCount = selectedEvents.length;
  const patternInsight = getRhythmInsight(selectedEvents, displaySummary, now);
  const latestPlay = selectedEvents
    .filter((event) => event.eventType === "play" && event.note?.trim())
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="analysis-stack pattern-stack">
      <section className="panel analysis-header pattern-header">
        <input
          aria-label="패턴 날짜"
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </section>

      <section className="panel pattern-hero-card">
        <div className={`rhythm-clock-shell${selectedEvents.length === 0 ? " empty" : ""}`} key={`clock-${selectedDate}`}>
          <svg className="rhythm-radial-chart" viewBox="0 0 320 320" role="img" aria-label="24시간 원형 리듬 차트">
            {Object.values(rhythmRings).map((ring) => (
              <circle
                className="rhythm-ring-base"
                cx="160"
                cy="160"
                fill="none"
                key={ring.key}
                r={ring.radius}
                stroke={ring.emptyColor}
                strokeWidth={ring.strokeWidth}
              />
            ))}

            {rhythmSegments.map((segment, index) => {
              const path = describeArc(160, 160, segment.radius, segment.startMinute, segment.endMinute);

              return (
                <path
                  className={`rhythm-segment rhythm-${segment.ringKey}`}
                  d={path}
                  fill="none"
                  aria-label={segment.title}
                  key={segment.id}
                  stroke={segment.color}
                  strokeLinecap="round"
                  strokeWidth={segment.strokeWidth}
                  style={{ animationDelay: `${index * 28}ms` } as CSSProperties}
                >
                  <title>{segment.title}</title>
                </path>
              );
            })}

            <circle className="rhythm-center-disk" cx="160" cy="160" r="38" />
          </svg>
          <div className="rhythm-clock-center">
            <span>{selectedEvents.length === 0 ? "비어 있는 하루" : "오늘 리듬"}</span>
            <strong>{totalPatternCount}개 기록</strong>
            <small>수유 {displaySummary.feedCount}회 · 수면 {formatDurationMinutes(displaySummary.sleepMinutes)}</small>
          </div>
          <div className="rhythm-clock-markers" aria-hidden="true">
            <span className="m-0">0</span>
            <span className="m-6">6</span>
            <span className="m-12">12</span>
            <span className="m-18">18</span>
          </div>
        </div>

        <div className="rhythm-insight-card">
          <span>Insight</span>
          <strong>{patternInsight}</strong>
        </div>

        <div className="rhythm-legend" aria-label="기록 유형 범례">
          {(activeTypes.length > 0 ? activeTypes : [{ key: "empty", label: "빈 시간", color: rhythmTypes.empty.color }]).map((item) => (
            <span key={item.key}>
              <i style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="panel rhythm-timeline-card">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">실제 흐름</p>
            <h3>시간대별 리듬</h3>
          </div>
        </div>
        <div className={`rhythm-timeline${rhythmSegments.length === 0 ? " empty" : ""}`} key={`timeline-${selectedDate}`}>
          {/*
            timeline data comes from the same selected day range as the radial chart,
            so tap targets stay aligned across views.
          */}
          <div className="rhythm-timeline-track">
            {rhythmSegments.length === 0 ? (
              <span className="rhythm-empty-pill">첫 기록을 남기면 하루 리듬이 표시됩니다.</span>
            ) : null}
            {rhythmSegments.map((event) => {
              const left = (event.startMinute / 1440) * 100;
              const width = Math.max(5, ((event.endMinute - event.startMinute) / 1440) * 100);

              return (
                <span
                  className="rhythm-event-pill"
                  key={event.id}
                  style={{
                    "--event-color": event.color,
                    "--event-soft-color": event.softColor,
                    left: `${left}%`,
                    top: `${event.lane * 30 + 8}px`,
                    width: `${Math.min(100 - left, width)}%`,
                  } as CSSProperties}
                  title={event.title}
                >
                  {event.label}
                </span>
              );
            })}
          </div>
          <div className="rhythm-time-axis" aria-hidden="true">
            <span>00</span>
            <span>03</span>
            <span>06</span>
            <span>09</span>
            <span>12</span>
            <span>15</span>
            <span>18</span>
            <span>21</span>
          </div>
        </div>
      </section>

      <section className="pattern-summary-strip">
        <article className="panel analysis-metric feed">
          <p>수유</p>
          <strong>{displaySummary.feedCount}회</strong>
          <small>총 {displaySummary.feedTotalMl}ml</small>
          <em>하루 리듬</em>
        </article>
        <article className="panel analysis-metric sleep">
          <p>수면</p>
          <strong>{formatDurationMinutes(displaySummary.sleepMinutes)}</strong>
          <small>{displaySummary.sleepCount}회 기록</small>
          <em>총 수면</em>
        </article>
        <article className="panel analysis-metric bath">
          <p>활동</p>
          <strong>{displaySummary.playCount + displaySummary.mealCount}회</strong>
          <small>놀이 {formatDurationMinutes(displaySummary.playMinutes)}</small>
          <em>목욕 {displaySummary.bathCount}회</em>
        </article>
      </section>

      {latestPlay ? (
        <section className="panel analysis-action">
          <strong>최근 놀이</strong>
          <p>{latestPlay.note?.trim()}</p>
        </section>
      ) : null}
    </section>
  );
}
