import { PointerEvent, useState } from "react";
import { BabyEvent } from "../types";
import { formatDateTime, formatDurationMinutes } from "../lib/time";

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
    return `수유 ${event.amountMl ?? 0}ml`;
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
    return `수면 ${formatDurationMinutes(minutes)}`;
  }

  if (event.eventType === "poop") {
    const amount = event.poopAmount ? poopAmountLabels[event.poopAmount] : "양 미입력";
    const color = event.poopColor ? poopColorLabels[event.poopColor] : "색상 미입력";
    return `대변 ${amount} · ${color}`;
  }

  return "소변 기록";
}

export function EventList({ events, onDelete, onEdit }: EventListProps) {
  const [dragStart, setDragStart] = useState<{ id: string; x: number } | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

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
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>최근 기록</h2>
        </div>
      </div>
      <div className="event-list">
        {events.map((event) => (
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
              <div className={`event-chip ${event.eventType}`}>
                <img alt={eventLabels[event.eventType]} src={eventIcons[event.eventType]} />
              </div>
              <div className="event-copy">
                <strong>{formatDateTime(event.occurredAt)}</strong>
                <span>{eventDetail(event)}</span>
              </div>
            </article>
          </div>
        ))}
        {events.length === 0 ? <p className="empty-copy">아직 기록이 없습니다.</p> : null}
      </div>
    </section>
  );
}
