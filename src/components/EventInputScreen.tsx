import { FormEvent, useEffect, useState } from "react";
import {
  BabyEvent,
  BabyProfile,
  CreateEventInput,
  EventType,
  PoopAmount,
  PoopColor,
} from "../types";
import { toLocalDateTimeInputValue } from "../lib/time";

interface EventInputScreenProps {
  baby: BabyProfile;
  editingEvent?: BabyEvent | null;
  initialEventType?: EventType;
  onSubmit: (input: CreateEventInput) => Promise<void>;
}

const eventOptions: Array<{ type: EventType; icon: string; label: string }> = [
  { type: "feed", icon: "/icons/feeding.svg", label: "수유" },
  { type: "sleep", icon: "/icons/sleeping.svg", label: "수면" },
  { type: "pee", icon: "/icons/pee.svg", label: "소변" },
  { type: "poop", icon: "/icons/poo.svg", label: "대변" },
];

const poopAmounts: Array<{ value: PoopAmount; label: string }> = [
  { value: "small", label: "적음" },
  { value: "normal", label: "보통" },
  { value: "large", label: "많음" },
];

const poopColors: Array<{ value: PoopColor; label: string; className: string }> = [
  { value: "ocher", label: "황토색", className: "ocher" },
  { value: "brown", label: "갈색", className: "brown" },
  { value: "dark_brown", label: "진한 갈색", className: "dark-brown" },
  { value: "green", label: "쑥색", className: "green" },
  { value: "red_orange", label: "다홍색", className: "red-orange" },
];

function toInputDateTime(value: string | null | undefined): string {
  return value ? toLocalDateTimeInputValue(new Date(value)) : toLocalDateTimeInputValue();
}

export function EventInputScreen({
  baby,
  editingEvent,
  initialEventType = "feed",
  onSubmit,
}: EventInputScreenProps) {
  const [eventType, setEventType] = useState<EventType>(initialEventType);
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeInputValue());
  const [endedAt, setEndedAt] = useState(toLocalDateTimeInputValue());
  const [amountMl, setAmountMl] = useState(100);
  const [poopAmount, setPoopAmount] = useState<PoopAmount>("normal");
  const [poopColor, setPoopColor] = useState<PoopColor>("ocher");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!editingEvent) {
      const now = toLocalDateTimeInputValue();
      setEventType(initialEventType);
      setOccurredAt(now);
      setEndedAt(now);
      setAmountMl(100);
      setPoopAmount("normal");
      setPoopColor("ocher");
      setNote("");
      return;
    }

    setEventType(editingEvent.eventType);
    setOccurredAt(toInputDateTime(editingEvent.occurredAt));
    setEndedAt(toInputDateTime(editingEvent.endedAt));
    setAmountMl(editingEvent.amountMl ?? 100);
    setPoopAmount(editingEvent.poopAmount ?? "normal");
    setPoopColor(editingEvent.poopColor ?? "ocher");
    setNote(editingEvent.note ?? "");
  }, [editingEvent, initialEventType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        babyId: baby.id,
        eventType,
        occurredAt,
        endedAt: eventType === "sleep" ? endedAt : null,
        amountMl: eventType === "feed" ? amountMl : null,
        poopAmount: eventType === "poop" ? poopAmount : null,
        poopColor: eventType === "poop" ? poopColor : null,
        note: note.trim() || undefined,
      });

      const now = toLocalDateTimeInputValue();
      setOccurredAt(now);
      setEndedAt(now);
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="screen-stack">
      <section className="panel">
        <div className="event-type-grid">
          {eventOptions.map((option) => (
            <button
              className={`event-type-button ${eventType === option.type ? "active" : ""}`}
              key={option.type}
              type="button"
              onClick={() => setEventType(option.type)}
            >
              <span aria-hidden="true">
                <img alt="" src={option.icon} />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{eventType === "sleep" ? "수면 시작" : "기록 시각"}</span>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>

          {eventType === "sleep" ? (
            <label className="field">
              <span>수면 종료</span>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(event) => setEndedAt(event.target.value)}
              />
            </label>
          ) : null}

          {eventType === "feed" ? (
            <div className="slider-block">
              <div className="slider-heading">
                <span>수유량</span>
                <strong>{amountMl}ml</strong>
              </div>
              <input
                max="300"
                min="0"
                step="5"
                type="range"
                value={amountMl}
                onChange={(event) => setAmountMl(Number(event.target.value))}
              />
              <div className="range-labels">
                <span>0ml</span>
                <span>300ml</span>
              </div>
            </div>
          ) : null}

          {eventType === "poop" ? (
            <>
              <div className="choice-block">
                <span>대변 양</span>
                <div className="choice-grid">
                  {poopAmounts.map((option) => (
                    <button
                      className={poopAmount === option.value ? "active" : ""}
                      key={option.value}
                      type="button"
                      onClick={() => setPoopAmount(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="choice-block">
                <span>대변 색상</span>
                <div className="color-grid">
                  {poopColors.map((option) => (
                    <button
                      className={poopColor === option.value ? "active" : ""}
                      aria-label={option.label}
                      key={option.value}
                      type="button"
                      onClick={() => setPoopColor(option.value)}
                    >
                      <i className={option.className} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <label className="field">
            <span>메모</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="선택 입력"
            />
          </label>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "저장 중..." : editingEvent ? "수정" : "기록 저장"}
          </button>
        </form>
      </section>
    </section>
  );
}
