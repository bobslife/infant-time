import { useEffect, useMemo, useState } from "react";
import type { BabyEvent } from "../types";

type RhythmMetric = "interval" | "total";
type RhythmSeriesKey = "bottle" | "breast" | "meal" | "sleep";

interface RhythmDay {
  dateKey: string;
  label: string;
  fullLabel: string;
  start: number;
  end: number;
}

interface RhythmDatum {
  dateKey: string;
  label: string;
  total: number;
  interval: number | null;
  hasRecords: boolean;
}

interface RhythmSeries {
  key: RhythmSeriesKey;
  label: string;
  icon: string;
  tone: "feed" | "breast" | "meal" | "sleep";
  data: RhythmDatum[];
}

interface RhythmAnalysisCardsProps {
  events: BabyEvent[];
}

const seriesMeta: Array<Omit<RhythmSeries, "data">> = [
  { key: "bottle", label: "분유", icon: "/icons/feeding.svg", tone: "feed" },
  { key: "breast", label: "모유", icon: "/icons/breastfeed.svg", tone: "breast" },
  { key: "meal", label: "이유식", icon: "/icons/babyfood.svg", tone: "meal" },
  { key: "sleep", label: "수면", icon: "/icons/sleeping.svg", tone: "sleep" },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRecentDays(now: Date): RhythmDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const isToday = index === 6;
    return {
      dateKey: toDateKey(date),
      label: isToday ? "오늘" : `${date.getMonth() + 1}/${date.getDate()}`,
      fullLabel: `${date.getMonth() + 1}월 ${date.getDate()}일${isToday ? " · 오늘" : ""}`,
      start: date.getTime(),
      end: next.getTime(),
    };
  });
}

function getEventsForSeries(events: BabyEvent[], key: RhythmSeriesKey) {
  if (key === "bottle") {
    return events.filter((event) => event.eventType === "feed" && (event.feedingMethod ?? "bottle") === "bottle");
  }
  if (key === "breast") {
    return events.filter((event) => event.eventType === "feed" && event.feedingMethod === "breast");
  }
  return events.filter((event) => event.eventType === key);
}

function getAverageInterval(events: BabyEvent[], key: RhythmSeriesKey): number | null {
  const sorted = [...events].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  const intervals: number[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = new Date(sorted[index].occurredAt).getTime();
    const previous = key === "sleep" && sorted[index - 1].endedAt
      ? new Date(sorted[index - 1].endedAt!).getTime()
      : new Date(sorted[index - 1].occurredAt).getTime();
    if (current > previous) intervals.push(Math.round((current - previous) / 60000));
  }

  if (!intervals.length) return null;
  return Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
}

function getTotal(events: BabyEvent[], key: RhythmSeriesKey, now: Date) {
  if (key === "bottle") return events.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  if (key === "breast") return events.reduce((sum, event) => sum + (event.breastLeftMinutes ?? 0) + (event.breastRightMinutes ?? 0), 0);
  if (key === "meal") return events.reduce((sum, event) => sum + (event.mealAmountG ?? 0), 0);
  return events.reduce((sum, event) => {
    const start = new Date(event.occurredAt).getTime();
    const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();
    return sum + Math.max(0, Math.round((end - start) / 60000));
  }, 0);
}

function formatDuration(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes}분`;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

function formatCompactDuration(value: number) {
  const hours = value / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
}

function formatTotal(key: RhythmSeriesKey, value: number, compact = false) {
  if (key === "bottle") return `${value}ml`;
  if (key === "breast") return `${value}분`;
  if (key === "meal") return `${value}g`;
  return compact ? formatCompactDuration(value) : formatDuration(value);
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export function RhythmAnalysisCards({ events }: RhythmAnalysisCardsProps) {
  const [metric, setMetric] = useState<RhythmMetric>("total");
  const [selectedIndex, setSelectedIndex] = useState(6);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const days = useMemo(() => buildRecentDays(now), [now]);
  const series = useMemo<RhythmSeries[]>(() => seriesMeta.map((meta) => ({
    ...meta,
    data: days.map((day) => {
      const dayEvents = getEventsForSeries(events, meta.key).filter((event) => {
        const occurredAt = new Date(event.occurredAt).getTime();
        return occurredAt >= day.start && occurredAt < day.end;
      });
      return {
        dateKey: day.dateKey,
        label: day.label,
        total: getTotal(dayEvents, meta.key, now),
        interval: getAverageInterval(dayEvents, meta.key),
        hasRecords: dayEvents.length > 0,
      };
    }),
  })), [days, events, now]);
  const selectedDay = days[selectedIndex] ?? days[6];
  const visibleSeries = series.filter((item) => item.data.some((datum) => datum.hasRecords));
  const hasRecentRecords = visibleSeries.length > 0;
  const missingLabels = visibleSeries.filter((item) => !item.data[selectedIndex]?.hasRecords).map((item) => item.label);
  const sleepSeries = visibleSeries.find((item) => item.key === "sleep");
  const mealSeries = visibleSeries.find((item) => item.key === "meal");
  const selectedSleep = sleepSeries?.data[selectedIndex];
  const averageSleep = sleepSeries
    ? average(sleepSeries.data.filter((item) => item.hasRecords).map((item) => item.total))
    : null;
  const sleepDifference = selectedSleep?.hasRecords && averageSleep
    ? Math.round(((selectedSleep.total - averageSleep) / averageSleep) * 100)
    : null;
  const selectedMealInterval = mealSeries?.data[selectedIndex]?.interval ?? null;
  const averageMealInterval = mealSeries
    ? average(mealSeries.data.map((item) => item.interval).filter((value): value is number => value != null))
    : null;

  return (
    <div className="rhythm-analysis-stack">
      <header className="rhythm-analysis-header">
        <div>
          <h1>한눈에 보는 리듬</h1>
          <span>분유·모유·이유식·수면의 평균 간격과 총량을 비교해요.</span>
        </div>
        <strong>최근 7일</strong>
      </header>

      {!hasRecentRecords ? (
        <section className="panel rhythm-analysis-empty">
          <img src="/icons/pattern.svg" alt="" />
          <strong>최근 7일 기록이 없어요</strong>
          <span>분유·모유·이유식·수면을 기록하면 날짜별 리듬이 표시돼요.</span>
        </section>
      ) : (
        <>
      <section className="panel rhythm-analysis-overview">
        <h2 className="rhythm-analysis-date-title">{selectedDay.fullLabel}</h2>
        <div className="rhythm-analysis-switch" role="group" aria-label="그래프 기준">
          <button type="button" className={metric === "total" ? "active" : ""} onClick={() => setMetric("total")}>총량</button>
          <button type="button" className={metric === "interval" ? "active" : ""} onClick={() => setMetric("interval")}>평균 간격</button>
        </div>

        <div className="rhythm-series-list" aria-live="polite">
          {visibleSeries.map((item) => {
            const values = item.data.map((datum) => metric === "interval" ? datum.interval ?? 0 : datum.total);
            const maxValue = Math.max(1, ...values);
            const selected = item.data[selectedIndex];
            return (
              <section className={`rhythm-series-card rhythm-series-${item.key}`} key={item.key}>
                <div className="rhythm-series-heading">
                  <span><img src={item.icon} alt="" />{item.label}</span>
                  <strong>{selectedDay.label} · {metric === "interval"
                    ? selected.interval == null ? "간격 계산 전" : formatDuration(selected.interval)
                    : selected.hasRecords ? formatTotal(item.key, selected.total) : "기록 없음"}</strong>
                </div>
                <div className="trend-bars rhythm-combined-bars" role="img" aria-label={`${item.label} ${metric === "interval" ? "평균 간격" : "총량"} 막대그래프`}>
                  {item.data.map((datum, index) => {
                    const value = metric === "interval" ? datum.interval : datum.hasRecords ? datum.total : null;
                    const valueLabel = value == null ? "-" : metric === "interval" ? formatCompactDuration(value) : formatTotal(item.key, value, true);
                    return (
                      <button className={`trend-day rhythm-trend-day${index === selectedIndex ? " selected" : ""}`} key={datum.dateKey} type="button" onClick={() => setSelectedIndex(index)} aria-label={`${datum.label} ${valueLabel}`}>
                        <span className="trend-stack">
                          <em>{valueLabel}</em>
                          <i className={item.tone} style={{ height: `${value == null ? 3 : Math.max(value > 0 ? 8 : 3, (value / maxValue) * 100)}%` }} />
                        </span>
                        <span>{datum.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <p className="rhythm-analysis-help">막대를 누르면 표시된 그래프의 선택 날짜가 함께 이동해요.</p>
      </section>

      <section className="panel rhythm-day-detail">
        <div className="chart-heading">
          <h3>{selectedDay.fullLabel} 상세</h3>
        </div>
        <div className="rhythm-day-detail-grid">
          {visibleSeries.map((item) => {
            const datum = item.data[selectedIndex];
            const totals = item.data.filter((entry) => entry.hasRecords).map((entry) => entry.total);
            const totalAverage = average(totals);
            const difference = datum.hasRecords && totalAverage
              ? Math.round(((datum.total - totalAverage) / totalAverage) * 100)
              : null;
            return (
              <article className={`rhythm-detail-${item.key}`} key={item.key}>
                <div><img src={item.icon} alt="" /><strong>{item.label}</strong></div>
                <dl>
                  <div><dt>평균 간격</dt><dd>{datum.interval == null ? "계산 전" : formatDuration(datum.interval)}</dd></div>
                  <div><dt>총량</dt><dd>{datum.hasRecords ? formatTotal(item.key, datum.total) : "기록 없음"}</dd></div>
                </dl>
                <small>{difference == null ? "비교할 기록이 더 필요해요" : `7일 평균 대비 ${difference > 0 ? "+" : ""}${difference}%`}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel rhythm-signal-panel">
        <span className="rhythm-signal-mark" aria-hidden="true">✦</span>
        <div>
          <p className="eyebrow">리듬 신호</p>
          <h3>평소와 다른 날만 먼저 알려드려요</h3>
          {missingLabels.length ? (
            <strong>{missingLabels.join("·")} 기록이 비어 있어요.</strong>
          ) : sleepDifference != null && Math.abs(sleepDifference) >= 10 ? (
            <strong>수면 총량이 최근 평균보다 {Math.abs(sleepDifference)}% {sleepDifference < 0 ? "적어요" : "많아요"}.</strong>
          ) : (
            <strong>선택한 날의 총량은 최근 평균 범위 안이에요.</strong>
          )}
          <span>{selectedMealInterval != null && averageMealInterval != null
            ? `이유식 평균 간격은 최근 평균과 ${Math.abs(selectedMealInterval - averageMealInterval)}분 차이예요.`
            : "기록이 더 쌓이면 평균 간격의 변화도 함께 알려드려요."}</span>
        </div>
      </section>
        </>
      )}
    </div>
  );
}
