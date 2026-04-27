import { PointerEvent, useState } from "react";
import { BabyEvent } from "../types";
import { formatDurationMinutes, formatTime } from "../lib/time";

interface EventListProps {
  events: BabyEvent[];
  onDelete: (eventId: string) => Promise<void>;
  onEdit: (event: BabyEvent) => void;
}

const eventLabels: Record<BabyEvent["eventType"], string> = {
  feed: "수유",
  sleep: "수면",
  pee: "소변",
  poop: "대변",
};

const eventIcons: Record<BabyEvent["eventType"], string> = {
  feed: "/icons/feeding.svg",
  sleep: "/icons/sleeping.svg",
  pee: "/icons/pee.svg",
  poop: "/icons/poo.svg",
};

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

function eventDetail(event: BabyEvent): string {
  if (event.eventType === "feed") {
    return `${event.amountMl ?? 0}ml`;
  }

  if (event.eventType === "sleep") {
    if (!event.endedAt) {
      return "수면";
    }

    const minutes = Math.max(
      0,
      Math.round(
        (new Date(event.endedAt).getTime() - new Date(event.occurredAt).getTime()) / 60000,
      ),
    );
    return formatDurationMinutes(minutes);
  }

  if (event.eventType === "poop") {
    const amount = event.poopAmount ? poopAmountLabels[event.poopAmount] : "양 미입력";
    const color = event.poopColor ? poopColorLabels[event.poopColor] : "색상 미입력";
    return `${color} · ${amount}`;
  }

  return "기록";
}

function eventDateKey(event: BabyEvent): string {
  const occurred = new Date(event.occurredAt);
  const year = occurred.getFullYear();
  const month = `${occurred.getMonth() + 1}`.padStart(2, "0");
  const date = `${occurred.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function formatDateHeader(dateKey: string): string {
  const [year, month, date] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, date);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;

  const formatted = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(target);

  return dateKey === todayKey ? `오늘 · ${formatted}` : formatted;
}

function groupEventsByDate(events: BabyEvent[]) {
  const groups = new Map<string, BabyEvent[]>();

  events.forEach((event) => {
    const key = eventDateKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return Array.from(groups.entries()).map(([dateKey, groupEvents]) => {
    const feedTotalMl = groupEvents
      .filter((event) => event.eventType === "feed")
      .reduce((total, event) => total + (event.amountMl ?? 0), 0);
    const poopCount = groupEvents.filter((event) => event.eventType === "poop").length;

    return {
      dateKey,
      events: groupEvents,
      feedTotalMl,
      poopCount,
    };
  });
}

export function EventList({ events, onDelete, onEdit }: EventListProps) {
  const [dragStart, setDragStart] = useState<{ id: string; x: number } | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const groupedEvents = groupEventsByDate(events);

  function handlePointerDown(event: PointerEvent<HTMLElement>, babyEvent: BabyEvent) {
    setDragStart({ id: babyEvent.id, x: event.clientX });
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>, babyEvent: BabyEvent) {
    if (!dragStart || dragStart.id !== babyEvent.id) {
      return;
    }

    const distance = event.clientX - dragStart.x;
    setDragStart(null);

    if (distance < -80) {
      setOpenedId(babyEvent.id);
      return;
    }

    if (Math.abs(distance) < 10) {
      if (openedId === babyEvent.id) {
        setOpenedId(null);
        return;
      }

      setOpenedId(null);
      onEdit(babyEvent);
    }
  }

  async function handleDelete(eventId: string) {
    await onDelete(eventId);
    setOpenedId(null);
  }

  return (
    <section className="panel recent-panel">
      <div className="section-heading">
        <div>
          <h2>최근 기록</h2>
        </div>
      </div>
      <div className="event-list timeline-list">
        {groupedEvents.map((group) => (
          <section className="event-date-group" key={group.dateKey}>
            <div className="event-date-heading">
              <strong>{formatDateHeader(group.dateKey)}</strong>
              <span>
                총 수유량 {group.feedTotalMl}ml · 대변 {group.poopCount}회
              </span>
            </div>
            <div className="event-date-list">
              {group.events.map((event) => (
                <div className="event-swipe" key={event.id}>
                  <button
                    className="event-delete-button"
                    type="button"
                    onClick={() => void handleDelete(event.id)}
                  >
                    삭제
                  </button>
                  <article
                    className={`event-row ${openedId === event.id ? "delete-open" : ""}`}
                    onPointerDown={(pointerEvent) => handlePointerDown(pointerEvent, event)}
                    onPointerUp={(pointerEvent) => handlePointerUp(pointerEvent, event)}
                  >
                    <time>{formatTime(event.occurredAt)}</time>
                    <div className={`event-chip ${event.eventType}`}>
                      <img alt={eventLabels[event.eventType]} src={eventIcons[event.eventType]} />
                    </div>
                    <div className="event-copy">
                      <strong>{eventLabels[event.eventType]}</strong>
                      <span>{eventDetail(event)}</span>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </section>
        ))}
        {events.length === 0 ? <p className="empty-copy">아직 기록이 없습니다.</p> : null}
      </div>
    </section>
  );
}
