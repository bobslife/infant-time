import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BabyEvent,
  BabyProfile,
  CreateEventInput,
  EventType,
  PoopAmount,
  PoopColor,
  UpdateEventInput,
} from "../types";
import { formatDurationMinutes, toLocalDateTimeInputValue } from "../lib/time";

interface EventInputScreenProps {
  baby: BabyProfile;
  editingEvent?: BabyEvent | null;
  events: BabyEvent[];
  initialEventType?: EventType;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  onUpdateEvent: (input: UpdateEventInput) => Promise<void>;
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

function toInputDate(value: string): string {
  return value.slice(0, 10);
}

function toInputTime(value: string): string {
  return value.slice(11, 16);
}

function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}`;
}

function getSleepDuration(startIso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(startIso).getTime()) / 60000));
  return formatDurationMinutes(minutes);
}

export function EventInputScreen({
  baby,
  editingEvent,
  events,
  initialEventType = "feed",
  onSubmit,
  onUpdateEvent,
}: EventInputScreenProps) {
  const [eventType, setEventType] = useState<EventType>(initialEventType);
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeInputValue());
  const [quickDate, setQuickDate] = useState(toInputDate(toLocalDateTimeInputValue()));
  const [quickTime, setQuickTime] = useState(toInputTime(toLocalDateTimeInputValue()));
  const [endedAt, setEndedAt] = useState(toLocalDateTimeInputValue());
  const [amountMl, setAmountMl] = useState(100);
  const [poopAmount, setPoopAmount] = useState<PoopAmount>("normal");
  const [poopColor, setPoopColor] = useState<PoopColor>("ocher");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(Boolean(editingEvent));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const ongoingSleep = useMemo(
    () =>
      events.find((event) => event.eventType === "sleep" && !event.endedAt) ??
      null,
    [events],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!editingEvent) {
      const current = toLocalDateTimeInputValue();
      setEventType(initialEventType);
      setOccurredAt(current);
      setQuickDate(toInputDate(current));
      setQuickTime(toInputTime(current));
      setEndedAt(current);
      setAmountMl(100);
      setPoopAmount("normal");
      setPoopColor("ocher");
      setNote("");
      setShowDetails(false);
      return;
    }

    setEventType(editingEvent.eventType);
    const nextOccurredAt = toInputDateTime(editingEvent.occurredAt);
    setOccurredAt(nextOccurredAt);
    setQuickDate(toInputDate(nextOccurredAt));
    setQuickTime(toInputTime(nextOccurredAt));
    setEndedAt(toInputDateTime(editingEvent.endedAt));
    setAmountMl(editingEvent.amountMl ?? 100);
    setPoopAmount(editingEvent.poopAmount ?? "normal");
    setPoopColor(editingEvent.poopColor ?? "ocher");
    setNote(editingEvent.note ?? "");
    setShowDetails(true);
  }, [editingEvent, initialEventType]);

  function showSavedToast(message: string) {
    setToastMessage(message);
  }

  function handleQuickDateChange(value: string) {
    setQuickDate(value);
    setOccurredAt(combineDateAndTime(value, quickTime));
  }

  function handleQuickTimeChange(value: string) {
    setQuickTime(value);
    setOccurredAt(combineDateAndTime(quickDate, value));
  }

  function buildCurrentInput(): CreateEventInput {
    return {
      babyId: baby.id,
      eventType,
      occurredAt,
      endedAt: eventType === "sleep" && editingEvent?.endedAt ? endedAt : null,
      amountMl: eventType === "feed" ? amountMl : null,
      poopAmount: eventType === "poop" ? poopAmount : null,
      poopColor: eventType === "poop" ? poopColor : null,
      note: note.trim() || undefined,
    };
  }

  async function submitQuick(input: CreateEventInput, message: string) {
    setIsSubmitting(true);

    try {
      await onSubmit(input);
      const current = toLocalDateTimeInputValue();
      setOccurredAt(current);
      setQuickDate(toInputDate(current));
      setQuickTime(toInputTime(current));
      setEndedAt(current);
      setNote("");
      showSavedToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(buildCurrentInput());

      showSavedToast(editingEvent ? "수정했어요" : "저장했어요");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickFeed() {
    if (editingEvent) {
      await submitQuick(buildCurrentInput(), "수유 기록 수정");
      return;
    }

    await submitQuick(
      {
        babyId: baby.id,
        eventType: "feed",
        occurredAt,
        endedAt: null,
        amountMl,
        poopAmount: null,
        poopColor: null,
        note: note.trim() || undefined,
      },
      `수유 ${amountMl}ml 저장`,
    );
  }

  async function handleSleepAction() {
    if (editingEvent) {
      await submitQuick(buildCurrentInput(), "수면 기록 수정");
      return;
    }

    setIsSubmitting(true);

    try {
      if (ongoingSleep) {
        await onUpdateEvent({
          id: ongoingSleep.id,
          babyId: baby.id,
          eventType: "sleep",
          occurredAt: toInputDateTime(ongoingSleep.occurredAt),
          endedAt: toLocalDateTimeInputValue(),
          amountMl: null,
          poopAmount: null,
          poopColor: null,
          note: ongoingSleep.note,
        });
        showSavedToast("수면 종료 저장");
        return;
      }

      await onSubmit({
        babyId: baby.id,
        eventType: "sleep",
        occurredAt,
        endedAt: null,
        amountMl: null,
        poopAmount: null,
        poopColor: null,
        note: note.trim() || undefined,
      });
      showSavedToast("수면 시작 저장");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickPee() {
    if (editingEvent) {
      await submitQuick(buildCurrentInput(), "소변 기록 수정");
      return;
    }

    await submitQuick(
      {
        babyId: baby.id,
        eventType: "pee",
        occurredAt,
        endedAt: null,
        amountMl: null,
        poopAmount: null,
        poopColor: null,
        note: note.trim() || undefined,
      },
      "소변 저장",
    );
  }

  async function handleQuickPoop() {
    if (editingEvent) {
      await submitQuick(buildCurrentInput(), "대변 기록 수정");
      return;
    }

    await submitQuick(
      {
        babyId: baby.id,
        eventType: "poop",
        occurredAt,
        endedAt: null,
        amountMl: null,
        poopAmount,
        poopColor,
        note: note.trim() || undefined,
      },
      "대변 저장",
    );
  }

  return (
    <section className="screen-stack action-screen">
      <section className="panel action-type-panel">
        <p className="eyebrow">활동 기록</p>
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

      <section className={`panel quick-action-card ${eventType}`}>
        <div className="quick-status">
          <span>현재 상태</span>
          {eventType === "feed" ? (
            <>
              <strong>{amountMl}ml</strong>
              <small>버튼으로 10ml씩 조절하고 바로 저장해요.</small>
            </>
          ) : null}
          {eventType === "sleep" ? (
            <>
              <strong>{ongoingSleep ? `${getSleepDuration(ongoingSleep.occurredAt, now)}째 수면 중` : "깨어 있음"}</strong>
              <small>{ongoingSleep ? "깨어났다면 종료 버튼을 누르세요." : "재우기 시작하면 시간이 자동 기록돼요."}</small>
            </>
          ) : null}
          {eventType === "pee" ? (
            <>
              <strong>지금 소변</strong>
              <small>한 번 누르면 현재 시간으로 저장돼요.</small>
            </>
          ) : null}
          {eventType === "poop" ? (
            <>
              <strong>{poopAmounts.find((item) => item.value === poopAmount)?.label}</strong>
              <small>기본값으로 바로 저장하거나 색상/양을 바꿀 수 있어요.</small>
            </>
          ) : null}
        </div>

        {eventType === "feed" ? (
          <div className="amount-stepper" aria-label="수유량">
            <button type="button" onClick={() => setAmountMl((current) => Math.max(0, current - 10))}>
              -10
            </button>
            <strong>{amountMl}ml</strong>
            <button type="button" onClick={() => setAmountMl((current) => Math.min(300, current + 10))}>
              +10
            </button>
          </div>
        ) : null}

        {eventType === "poop" ? (
          <div className="quick-poop-row">
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
        ) : null}

        <div className="quick-time-card" aria-label="기록 시간">
          <label>
            <span>날짜</span>
            <input
              type="date"
              value={quickDate}
              onChange={(event) => handleQuickDateChange(event.target.value)}
            />
          </label>
          <label>
            <span>시간</span>
            <input
              type="time"
              value={quickTime}
              onChange={(event) => handleQuickTimeChange(event.target.value)}
            />
          </label>
        </div>

        <div className="quick-button-row">
          {eventType === "feed" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleQuickFeed()}>
              {editingEvent ? "수유 수정하기" : "수유 기록하기"}
            </button>
          ) : null}
          {eventType === "sleep" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleSleepAction()}>
              {editingEvent ? "수면 수정하기" : ongoingSleep ? "지금 깨어남" : "지금 재우기"}
            </button>
          ) : null}
          {eventType === "pee" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleQuickPee()}>
              {editingEvent ? "소변 수정하기" : "소변 바로 기록"}
            </button>
          ) : null}
          {eventType === "poop" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleQuickPoop()}>
              {editingEvent ? "대변 수정하기" : "대변 바로 기록"}
            </button>
          ) : null}
        </div>

        <button className="detail-toggle" type="button" onClick={() => setShowDetails((current) => !current)}>
          {showDetails ? "메모 닫기" : "메모 수정"}
        </button>
      </section>

      {showDetails ? (
        <section className="panel">
          <form className="entry-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>메모</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="선택 입력"
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "저장 중..." : editingEvent ? "수정" : "메모 저장"}
            </button>
          </form>
        </section>
      ) : null}

      {toastMessage ? <div className="toast-message">{toastMessage}</div> : null}
    </section>
  );
}
