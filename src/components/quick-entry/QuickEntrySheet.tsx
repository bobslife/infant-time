import { useEffect, useMemo, useRef, useState } from "react";
import { formatDurationMinutes, formatTime, toLocalDateTimeInputValue } from "../../lib/time";
import {
  BabyEvent,
  BabyProfile,
  CreateEventInput,
  DiaperType,
  EventType,
  MealReaction,
  UpdateEventInput,
} from "../../types";

interface QuickEntrySheetProps {
  baby: BabyProfile;
  eventType: EventType | null;
  events: BabyEvent[];
  onClose: () => void;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  onUpdateEvent: (input: UpdateEventInput) => Promise<void>;
}

const eventLabels: Partial<Record<EventType, string>> = {
  feed: "수유",
  sleep: "수면",
  diaper: "기저귀",
  medicine: "약",
  temperature: "체온",
  meal: "이유식",
  memo: "메모",
};

const feedAmounts = [60, 80, 100, 120, 140];
const temperaturePresets = [36.5, 36.8, 37.2, 37.8];
const mealNames = ["쌀미음", "분유", "과일", "채소"];
const mealAmounts = [50, 80, 100];
const diaperOptions: Array<{ value: DiaperType; label: string }> = [
  { value: "wet", label: "소변" },
  { value: "dirty", label: "대변" },
  { value: "both", label: "둘다" },
];

function triggerHaptic() {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

function getSleepDuration(startIso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(startIso).getTime()) / 60000));
  return formatDurationMinutes(minutes);
}

function buildSleepEndInput(event: BabyEvent, endedAt: string): UpdateEventInput {
  return {
    id: event.id,
    babyId: event.babyId,
    eventType: "sleep",
    occurredAt: toLocalDateTimeInputValue(new Date(event.occurredAt)),
    endedAt,
    amountMl: event.amountMl ?? null,
    diaperType: event.diaperType ?? null,
    poopAmount: event.poopAmount ?? null,
    poopColor: event.poopColor ?? null,
    medicineName: event.medicineName ?? null,
    medicineDose: event.medicineDose ?? null,
    medicineNextAt: event.medicineNextAt ? toLocalDateTimeInputValue(new Date(event.medicineNextAt)) : null,
    temperatureC: event.temperatureC ?? null,
    temperatureLocation: event.temperatureLocation ?? null,
    mealName: event.mealName ?? null,
    mealAmountG: event.mealAmountG ?? null,
    mealReaction: event.mealReaction ?? null,
    note: event.note,
  };
}

export function QuickEntrySheet({
  baby,
  eventType,
  events,
  onClose,
  onSubmit,
  onUpdateEvent,
}: QuickEntrySheetProps) {
  const [amountMl, setAmountMl] = useState(120);
  const [diaperType, setDiaperType] = useState<DiaperType>("wet");
  const [medicineName, setMedicineName] = useState("약");
  const [medicineDose, setMedicineDose] = useState("");
  const [temperatureC, setTemperatureC] = useState(36.8);
  const [mealName, setMealName] = useState("쌀미음");
  const [mealAmountG, setMealAmountG] = useState(80);
  const [mealReaction] = useState<MealReaction>("good");
  const [memoText, setMemoText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const submitLockRef = useRef(false);

  const ongoingSleepEvents = useMemo(
    () => events.filter((event) => event.eventType === "sleep" && !event.endedAt),
    [events],
  );
  const ongoingSleep = ongoingSleepEvents[0] ?? null;
  const feedEvents = useMemo(
    () => events.filter((event) => event.eventType === "feed").slice(0, 5),
    [events],
  );
  const recentFeedAverage = feedEvents.length
    ? Math.round(feedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0) / feedEvents.length)
    : null;
  const previousFeedAmount = feedEvents[0]?.amountMl ?? null;
  const feedDiff = previousFeedAmount === null ? null : amountMl - previousFeedAmount;
  const lastMedicine = useMemo(
    () => events.find((event) => event.eventType === "medicine") ?? null,
    [events],
  );

  useEffect(() => {
    if (!eventType) {
      return;
    }

    setAmountMl(120);
    setDiaperType("wet");
    setMedicineName("약");
    setMedicineDose("");
    setTemperatureC(36.8);
    setMealName("쌀미음");
    setMealAmountG(80);
    setMemoText("");
    setToastMessage(null);
  }, [eventType]);

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

  if (!eventType) {
    return null;
  }

  function buildInput(): CreateEventInput {
    return {
      babyId: baby.id,
      eventType: eventType ?? "feed",
      occurredAt: toLocalDateTimeInputValue(),
      endedAt: null,
      amountMl: eventType === "feed" ? amountMl : null,
      diaperType: eventType === "diaper" ? diaperType : null,
      poopAmount: eventType === "diaper" && diaperType !== "wet" ? "normal" : null,
      poopColor: eventType === "diaper" && diaperType !== "wet" ? "ocher" : null,
      medicineName: eventType === "medicine" ? medicineName.trim() || "약" : null,
      medicineDose: eventType === "medicine" ? medicineDose.trim() || null : null,
      medicineNextAt: null,
      temperatureC: eventType === "temperature" ? temperatureC : null,
      temperatureLocation: eventType === "temperature" ? "forehead" : null,
      mealName: eventType === "meal" ? mealName.trim() || "쌀미음" : null,
      mealAmountG: eventType === "meal" ? mealAmountG : null,
      mealReaction: eventType === "meal" ? mealReaction : null,
      note: eventType === "memo" ? memoText.trim() || undefined : undefined,
    };
  }

  async function handleSave() {
    if (submitLockRef.current) {
      return;
    }

    if (eventType === "temperature" && (temperatureC < 34 || temperatureC > 43)) {
      setToastMessage("체온을 34~43도 사이로 입력해 주세요");
      return;
    }

    if (eventType === "meal" && mealAmountG <= 0) {
      setToastMessage("이유식 양을 입력해 주세요");
      return;
    }

    if (eventType === "memo" && !memoText.trim()) {
      setToastMessage("메모 내용을 입력해 주세요");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (eventType === "sleep" && ongoingSleep) {
        const endedAt = toLocalDateTimeInputValue();
        await Promise.all(
          ongoingSleepEvents.map((sleepEvent) => onUpdateEvent(buildSleepEndInput(sleepEvent, endedAt))),
        );
        setToastMessage(ongoingSleepEvents.length > 1 ? "진행 중 수면을 모두 종료했어요" : "수면 종료 저장");
      } else {
        await onSubmit(buildInput());
        setToastMessage(eventType === "sleep" ? "수면 시작 저장" : "저장했어요");
      }

      triggerHaptic();
      window.setTimeout(onClose, 520);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="quick-entry-backdrop" role="presentation" onClick={onClose}>
      <section
        className={`quick-entry-sheet quick-action-card ${eventType}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${eventLabels[eventType] ?? "활동"} 빠른 기록`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="quick-entry-header">
          <div>
            <span>빠른 기록</span>
            <strong>{eventLabels[eventType]}</strong>
          </div>
          <button aria-label="닫기" type="button" onClick={onClose}>x</button>
        </header>

        {eventType === "feed" ? (
          <>
            <div className="quick-entry-value">
              <strong>{amountMl}ml</strong>
              <span>
                {recentFeedAverage ? `최근 평균 ${recentFeedAverage}ml` : "수유량"}
                {feedDiff !== null ? ` · 이전보다 ${Math.abs(feedDiff)}ml ${feedDiff >= 0 ? "많아요" : "적어요"}` : ""}
              </span>
            </div>
            <div className="quick-chip-row" aria-label="빠른 수유량">
              {feedAmounts.map((amount) => (
                <button className={amountMl === amount ? "active" : ""} key={amount} type="button" onClick={() => setAmountMl(amount)}>
                  {amount}
                </button>
              ))}
            </div>
            <div className="amount-stepper" aria-label="수유량 조정">
              <button type="button" onClick={() => setAmountMl((current) => Math.max(0, current - 10))}>-10</button>
              <strong>{amountMl}ml</strong>
              <button type="button" onClick={() => setAmountMl((current) => Math.min(300, current + 10))}>+10</button>
            </div>
          </>
        ) : null}

        {eventType === "sleep" ? (
          <div className="sleep-status-card">
            <span>{ongoingSleep ? "수면 중" : "깨어 있음"}</span>
            <strong>{ongoingSleep ? `${getSleepDuration(ongoingSleep.occurredAt, now)}째` : "수면 시작"}</strong>
            <small>{ongoingSleep ? `${formatTime(ongoingSleep.occurredAt)} 시작` : "지금 시간으로 수면을 시작해요."}</small>
          </div>
        ) : null}

        {eventType === "diaper" ? (
          <div className="choice-grid">
            {diaperOptions.map((option) => (
              <button className={diaperType === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setDiaperType(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {eventType === "medicine" ? (
          <div className="stacked-fields">
            <p className="quick-entry-hint">
              {lastMedicine ? `최근 복용 ${formatTime(lastMedicine.occurredAt)}` : "자주 먹는 약은 이름만 입력해도 바로 저장할 수 있어요."}
            </p>
            <label className="medicine-name-field">
              <span>약 이름</span>
              <input value={medicineName} onChange={(event) => setMedicineName(event.target.value)} placeholder="약" />
            </label>
            <label className="medicine-name-field">
              <span>용량</span>
              <input value={medicineDose} onChange={(event) => setMedicineDose(event.target.value)} placeholder="선택 입력" />
            </label>
          </div>
        ) : null}

        {eventType === "temperature" ? (
          <div className="stacked-fields">
            <div className="quick-chip-row quick-chip-row-four" aria-label="체온 빠른 선택">
              {temperaturePresets.map((value) => (
                <button className={temperatureC === value ? "active" : ""} key={value} type="button" onClick={() => setTemperatureC(value)}>
                  {value.toFixed(1)}
                </button>
              ))}
            </div>
            <label className="medicine-name-field">
              <span>체온</span>
              <input type="number" step="0.1" min="34" max="43" value={temperatureC} onChange={(event) => setTemperatureC(Number(event.target.value))} />
            </label>
          </div>
        ) : null}

        {eventType === "meal" ? (
          <div className="stacked-fields">
            <div className="quick-chip-row quick-chip-row-four" aria-label="이유식 종류">
              {mealNames.map((name) => (
                <button className={mealName === name ? "active" : ""} key={name} type="button" onClick={() => setMealName(name)}>
                  {name}
                </button>
              ))}
            </div>
            <div className="choice-grid" aria-label="이유식 양">
              {mealAmounts.map((amount) => (
                <button className={mealAmountG === amount ? "active" : ""} key={amount} type="button" onClick={() => setMealAmountG(amount)}>
                  {amount}g
                </button>
              ))}
            </div>
            <label className="medicine-name-field">
              <span>양(g)</span>
              <input type="number" min="1" max="500" value={mealAmountG} onChange={(event) => setMealAmountG(Number(event.target.value))} />
            </label>
          </div>
        ) : null}

        {eventType === "memo" ? (
          <div className="stacked-fields">
            <label className="medicine-name-field">
              <span>메모</span>
              <textarea
                rows={4}
                value={memoText}
                onChange={(event) => setMemoText(event.target.value)}
                placeholder="오늘 기억하고 싶은 내용을 적어 주세요"
              />
            </label>
          </div>
        ) : null}

        <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleSave()}>
          {eventType === "sleep" && ongoingSleep ? "수면 종료" : eventType === "memo" ? "메모 저장" : "저장하기"}
        </button>

        {toastMessage ? <div className="toast-message sheet-toast">{toastMessage}</div> : null}
      </section>
    </div>
  );
}
