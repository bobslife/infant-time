import { useEffect, useState, type CSSProperties } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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

interface RhythmSlot {
  key: PatternTypeKey;
  label: string;
  color: string;
  value: number;
  priority: number;
}

interface RhythmEvent {
  id: string;
  key: PatternTypeKey;
  label: string;
  color: string;
  softColor: string;
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

const RHYTHM_SLOT_MINUTES = 30;
const RHYTHM_SLOT_COUNT = 1440 / RHYTHM_SLOT_MINUTES;

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

function getMinuteOfDay(value: string): number {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function getRhythmEventRange(event: BabyEvent): { startMinute: number; endMinute: number } {
  const startMinute = getMinuteOfDay(event.occurredAt);
  const hasDuration = (event.eventType === "sleep" || event.eventType === "play") && event.endedAt;
  const rawEndMinute = hasDuration ? getMinuteOfDay(event.endedAt as string) : startMinute + RHYTHM_SLOT_MINUTES;
  const endMinute = rawEndMinute <= startMinute && hasDuration ? 1440 : rawEndMinute;

  return {
    startMinute: Math.max(0, Math.min(1439, startMinute)),
    endMinute: Math.max(startMinute + RHYTHM_SLOT_MINUTES, Math.min(1440, endMinute)),
  };
}

function buildRhythmSlots(events: BabyEvent[]): RhythmSlot[] {
  const slots: RhythmSlot[] = Array.from({ length: RHYTHM_SLOT_COUNT }, () => ({
    key: "empty",
    label: rhythmTypes.empty.label,
    color: rhythmTypes.empty.color,
    value: 1,
    priority: rhythmTypes.empty.priority,
  }));

  events
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .forEach((event) => {
      const type = getPatternType(event);
      const range = getRhythmEventRange(event);
      const startSlot = Math.floor(range.startMinute / RHYTHM_SLOT_MINUTES);
      const endSlot = Math.max(startSlot + 1, Math.ceil(range.endMinute / RHYTHM_SLOT_MINUTES));

      for (let slotIndex = startSlot; slotIndex < Math.min(RHYTHM_SLOT_COUNT, endSlot); slotIndex += 1) {
        if (type.priority >= slots[slotIndex].priority) {
          slots[slotIndex] = {
            key: type.key,
            label: type.label,
            color: type.color,
            value: 1,
            priority: type.priority,
          };
        }
      }
    });

  return slots;
}

function buildRhythmEvents(events: BabyEvent[]): RhythmEvent[] {
  return events
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .map((event, index) => {
      const type = getPatternType(event);
      const range = getRhythmEventRange(event);
      const duration = Math.max(RHYTHM_SLOT_MINUTES, range.endMinute - range.startMinute);

      return {
        id: event.id,
        key: type.key,
        label: type.label,
        color: type.color,
        softColor: type.softColor,
        startMinute: range.startMinute,
        endMinute: range.endMinute,
        lane: index % 3,
        title: `${formatTime(event.occurredAt)} ${type.label}${duration > RHYTHM_SLOT_MINUTES ? ` ${formatDurationMinutes(duration)}` : ""}`,
      };
    });
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
  const selectedEvents = getEventsForDate(events, selectedDate);
  const todayKey = toDateKey(now);
  const isTodaySelected = selectedDate === todayKey;
  const displaySummary = isTodaySelected
    ? {
        ...summary,
        sleepMinutes: getDurationMinutes(selectedEvents, "sleep", now),
        playMinutes: getDurationMinutes(selectedEvents, "play", now),
      }
    : summary;
  const rhythmSlots = buildRhythmSlots(selectedEvents);
  const rhythmEvents = buildRhythmEvents(selectedEvents);
  const activeTypes = Array.from(
    new Map(
      rhythmEvents.map((event) => [
        event.key,
        {
          key: event.key,
          label: event.label,
          color: event.color,
        },
      ]),
    ).values(),
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
        <div className="pattern-hero-heading">
          <span>{selectedDate}</span>
        </div>

        <div className={`rhythm-clock-shell${selectedEvents.length === 0 ? " empty" : ""}`} key={`clock-${selectedDate}`}>
          <ResponsiveContainer width="100%" height={310}>
            <PieChart>
              <Pie
                animationDuration={760}
                animationEasing="ease-out"
                cx="50%"
                cy="50%"
                data={rhythmSlots}
                dataKey="value"
                endAngle={-270}
                innerRadius="66%"
                isAnimationActive
                nameKey="label"
                outerRadius="92%"
                paddingAngle={0.35}
                startAngle={90}
                stroke="rgba(255,255,255,0.74)"
                strokeWidth={1}
              >
                {rhythmSlots.map((slot, index) => (
                  <Cell fill={slot.color} key={`${slot.key}-${index}`} />
                ))}
              </Pie>
              <Tooltip formatter={(_, name) => [name === rhythmTypes.empty.label ? "기록 없음" : "기록됨", name]} />
            </PieChart>
          </ResponsiveContainer>
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
        <div className={`rhythm-timeline${rhythmEvents.length === 0 ? " empty" : ""}`} key={`timeline-${selectedDate}`}>
          <div className="rhythm-timeline-track">
            {rhythmEvents.length === 0 ? (
              <span className="rhythm-empty-pill">첫 기록을 남기면 하루 리듬이 표시됩니다.</span>
            ) : null}
            {rhythmEvents.map((event) => {
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
