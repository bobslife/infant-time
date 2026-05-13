import { useEffect, useMemo, useRef, useState } from "react";
import { AdBanner } from "./ads/AdBanner";
import {
  BabyEvent,
  BabyProfile,
  CreateEventInput,
  DiaperType,
  EventType,
  MealReaction,
  PoopAmount,
  PoopColor,
  TemperatureLocation,
  UpdateEventInput,
} from "../types";
import { formatDurationMinutes, formatTime, toLocalDateTimeInputValue } from "../lib/time";

interface EventInputScreenProps {
  baby: BabyProfile;
  editingEvent?: BabyEvent | null;
  events: BabyEvent[];
  initialEventType?: EventType;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  onUpdateEvent: (input: UpdateEventInput) => Promise<void>;
}

const feedQuickAmounts = [70, 100, 130, 170, 200, 230];

const diaperOptions: Array<{ value: DiaperType; label: string }> = [
  { value: "wet", label: "소변" },
  { value: "dirty", label: "대변" },
  { value: "both", label: "둘다" },
];

const poopAmounts: Array<{ value: PoopAmount; label: string }> = [
  { value: "small", label: "적음" },
  { value: "normal", label: "보통" },
  { value: "large", label: "많음" },
];

const poopColors: Array<{ value: PoopColor; label: string; className: string }> = [
  { value: "ocher", label: "노랑", className: "ocher" },
  { value: "green", label: "초록", className: "green" },
  { value: "brown", label: "갈색", className: "brown" },
  { value: "dark_brown", label: "진갈", className: "dark-brown" },
  { value: "red_orange", label: "다홍", className: "red-orange" },
];

const temperatureLocations: Array<{ value: TemperatureLocation; label: string }> = [
  { value: "forehead", label: "이마" },
  { value: "ear", label: "귀" },
  { value: "armpit", label: "겨드랑이" },
];

const mealReactions: Array<{ value: MealReaction; label: string }> = [
  { value: "good", label: "잘 먹음" },
  { value: "normal", label: "보통" },
  { value: "poor", label: "적게 먹음" },
  { value: "allergy", label: "반응 있음" },
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

function isEndedBeforeStarted(start: string, end: string): boolean {
  return new Date(end).getTime() < new Date(start).getTime();
}

function normalizeEventType(type: EventType): EventType {
  if (type === "pee" || type === "poop") {
    return "diaper";
  }

  return type;
}

function triggerHaptic() {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export function EventInputScreen({
  baby,
  editingEvent,
  events,
  initialEventType = "feed",
  onSubmit,
  onUpdateEvent,
}: EventInputScreenProps) {
  const initialOccurredAt = editingEvent ? toInputDateTime(editingEvent.occurredAt) : toLocalDateTimeInputValue();
  const initialEndedAt = editingEvent?.endedAt ? toInputDateTime(editingEvent.endedAt) : "";
  const [eventType, setEventType] = useState<EventType>(normalizeEventType(editingEvent?.eventType ?? initialEventType));
  const [occurredAt, setOccurredAt] = useState(initialOccurredAt);
  const [quickDate, setQuickDate] = useState(toInputDate(initialOccurredAt));
  const [quickTime, setQuickTime] = useState(toInputTime(initialOccurredAt));
  const [endedAt, setEndedAt] = useState(initialEndedAt);
  const [endedDate, setEndedDate] = useState(initialEndedAt ? toInputDate(initialEndedAt) : "");
  const [endedTime, setEndedTime] = useState(initialEndedAt ? toInputTime(initialEndedAt) : "");
  const [amountMl, setAmountMl] = useState(120);
  const [diaperType, setDiaperType] = useState<DiaperType>("wet");
  const [poopAmount, setPoopAmount] = useState<PoopAmount>("normal");
  const [poopColor, setPoopColor] = useState<PoopColor>("ocher");
  const [medicineName, setMedicineName] = useState("");
  const [medicineDose, setMedicineDose] = useState("");
  const [medicineNextAt, setMedicineNextAt] = useState("");
  const [temperatureC, setTemperatureC] = useState(36.6);
  const [temperatureLocation, setTemperatureLocation] = useState<TemperatureLocation>("forehead");
  const [mealName, setMealName] = useState("");
  const [mealAmountG, setMealAmountG] = useState(80);
  const [mealReaction, setMealReaction] = useState<MealReaction>("good");
  const [memoText, setMemoText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const submitLockRef = useRef(false);

  const ongoingSleep = useMemo(
    () => events.find((event) => event.eventType === "sleep" && !event.endedAt) ?? null,
    [events],
  );
  const latestSleepEventId = useMemo(
    () => events.find((event) => event.eventType === "sleep")?.id ?? null,
    [events],
  );
  const latestFeedAmount = useMemo(
    () => events.find((event) => event.eventType === "feed" && event.amountMl !== null)?.amountMl ?? 70,
    [events],
  );

  const feedEvents = useMemo(
    () => events.filter((event) => event.eventType === "feed").slice(0, 5),
    [events],
  );
  const recentFeedAverage = feedEvents.length
    ? Math.round(feedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0) / feedEvents.length)
    : null;
  const previousFeedAmount = feedEvents[0]?.amountMl ?? null;
  const feedDiff = previousFeedAmount === null ? null : amountMl - previousFeedAmount;

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
      const normalizedInitialType = normalizeEventType(initialEventType);
      const defaultSleepStart = ongoingSleep ? toInputDateTime(ongoingSleep.occurredAt) : current;
      const defaultSleepEnd = normalizedInitialType === "sleep" && ongoingSleep ? current : "";
      setEventType(normalizedInitialType);
      setOccurredAt(current);
      setQuickDate(toInputDate(current));
      setQuickTime(toInputTime(current));
      if (normalizedInitialType === "sleep") {
        setOccurredAt(defaultSleepStart);
        setQuickDate(toInputDate(defaultSleepStart));
        setQuickTime(toInputTime(defaultSleepStart));
        setEndedAtFromDateTime(defaultSleepEnd);
      } else {
        setEndedAtFromDateTime("");
      }
      setAmountMl(initialEventType === "feed" ? latestFeedAmount : 120);
      setDiaperType("wet");
      setPoopAmount("normal");
      setPoopColor("ocher");
      setMedicineName("");
      setMedicineDose("");
      setMedicineNextAt("");
      setTemperatureC(36.6);
      setTemperatureLocation("forehead");
      setMealName("");
      setMealAmountG(80);
      setMealReaction("good");
      setMemoText("");
      if (normalizedInitialType === "play") {
        setEndedAtFromDateTime("");
      }
      return;
    }

    const normalizedType = normalizeEventType(editingEvent.eventType);
    setEventType(normalizedType);
    const nextOccurredAt = toInputDateTime(editingEvent.occurredAt);
    setOccurredAt(nextOccurredAt);
    setQuickDate(toInputDate(nextOccurredAt));
    setQuickTime(toInputTime(nextOccurredAt));
    const nextEndedAt = editingEvent.endedAt ? toInputDateTime(editingEvent.endedAt) : "";
    setEndedAt(nextEndedAt);
    setEndedDate(nextEndedAt ? toInputDate(nextEndedAt) : "");
    setEndedTime(nextEndedAt ? toInputTime(nextEndedAt) : "");
    setAmountMl(editingEvent.amountMl ?? 120);
    setDiaperType(editingEvent.diaperType ?? (editingEvent.eventType === "poop" ? "dirty" : "wet"));
    setPoopAmount(editingEvent.poopAmount ?? "normal");
    setPoopColor(editingEvent.poopColor ?? "ocher");
    setMedicineName(editingEvent.medicineName ?? "");
    setMedicineDose(editingEvent.medicineDose ?? "");
    setMedicineNextAt(editingEvent.medicineNextAt ? toInputDateTime(editingEvent.medicineNextAt) : "");
    setTemperatureC(editingEvent.temperatureC ?? 36.6);
    setTemperatureLocation(editingEvent.temperatureLocation ?? "forehead");
    setMealName(editingEvent.mealName ?? "");
    setMealAmountG(editingEvent.mealAmountG ?? 80);
    setMealReaction(editingEvent.mealReaction ?? "good");
    setMemoText(editingEvent.eventType === "memo" || editingEvent.eventType === "play" ? editingEvent.note ?? "" : "");
  }, [editingEvent, initialEventType, latestFeedAmount, ongoingSleep]);

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

  function handleEndedDateChange(value: string) {
    setEndedDate(value);
    setEndedAt(value && endedTime ? combineDateAndTime(value, endedTime) : "");
  }

  function handleEndedTimeChange(value: string) {
    const nextDate = endedDate || quickDate;
    setEndedDate(nextDate);
    setEndedTime(value);
    setEndedAt(nextDate && value ? combineDateAndTime(nextDate, value) : "");
  }

  function setEndedAtFromDateTime(value: string) {
    setEndedAt(value);
    setEndedDate(value ? toInputDate(value) : "");
    setEndedTime(value ? toInputTime(value) : "");
  }

  function buildCurrentInput(): CreateEventInput {
    const hasPoopDetail = eventType === "diaper" && diaperType !== "wet";

    return {
      babyId: baby.id,
      eventType,
      occurredAt,
      endedAt: (eventType === "sleep" || eventType === "play") && endedAt ? endedAt : null,
      amountMl: eventType === "feed" ? amountMl : null,
      diaperType: eventType === "diaper" ? diaperType : null,
      poopAmount: hasPoopDetail ? poopAmount : null,
      poopColor: hasPoopDetail ? poopColor : null,
      medicineName: eventType === "medicine" ? medicineName.trim() : null,
      medicineDose: eventType === "medicine" ? medicineDose.trim() || null : null,
      medicineNextAt: eventType === "medicine" && medicineNextAt ? medicineNextAt : null,
      temperatureC: eventType === "temperature" ? temperatureC : null,
      temperatureLocation: eventType === "temperature" ? temperatureLocation : null,
      mealName: eventType === "meal" ? mealName.trim() : null,
      mealAmountG: eventType === "meal" ? mealAmountG : null,
      mealReaction: eventType === "meal" ? mealReaction : null,
      note: eventType === "memo" || eventType === "play" ? memoText.trim() || undefined : editingEvent?.note ?? undefined,
    };
  }

  function validateInput(input: CreateEventInput): string | null {
    if (input.eventType === "medicine" && !input.medicineName?.trim()) {
      return "약 종류를 입력해 주세요";
    }

    if (input.eventType === "temperature" && (!input.temperatureC || input.temperatureC < 34 || input.temperatureC > 43)) {
      return "체온을 34~43도 사이로 입력해 주세요";
    }

    if (input.eventType === "meal" && !input.mealName?.trim()) {
      return "이유식 종류를 입력해 주세요";
    }

    if (input.eventType === "memo" && !input.note?.trim()) {
      return "메모를 입력해 주세요";
    }

    if (input.eventType === "play" && !input.note?.trim()) {
      return "놀이 내용을 입력해 주세요";
    }

    if (input.eventType === "play" && !input.endedAt) {
      return "놀이 종료 시간을 입력해 주세요";
    }

    if (input.eventType === "sleep" && input.endedAt && isEndedBeforeStarted(input.occurredAt, input.endedAt)) {
      return "종료 시간이 시작 시간보다 빨라요";
    }

    if (input.eventType === "play" && input.endedAt && isEndedBeforeStarted(input.occurredAt, input.endedAt)) {
      return "종료 시간이 시작 시간보다 빨라요";
    }

    return null;
  }

  async function submitQuick(input: CreateEventInput, message: string) {
    if (submitLockRef.current) {
      return;
    }

    const errorMessage = validateInput(input);
    if (errorMessage) {
      showSavedToast(errorMessage);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (editingEvent) {
        await onUpdateEvent({ ...input, id: editingEvent.id });
      } else {
        await onSubmit(input);
      }
      triggerHaptic();
      const current = toLocalDateTimeInputValue();
      setOccurredAt(current);
      setQuickDate(toInputDate(current));
      setQuickTime(toInputTime(current));
      setEndedAtFromDateTime("");
      showSavedToast(message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleQuickFeed() {
    await submitQuick(buildCurrentInput(), editingEvent ? "수유 기록 수정" : `수유 ${amountMl}ml 저장`);
  }

  async function handleSleepSave() {
    const input = buildCurrentInput();

    if (editingEvent) {
      if (editingEvent.eventType === "sleep" && !endedAt) {
        const current = toLocalDateTimeInputValue();
        setEndedAtFromDateTime(current);
        await submitQuick({ ...input, endedAt: current }, "수면 종료 저장");
        return;
      }

      await submitQuick(input, endedAt ? "수면 수정 저장" : "수면 종료 저장");
      return;
    }

    if (ongoingSleep) {
      await submitQuick(input, "수면 종료 저장");
      return;
    }

    await submitQuick(input, "수면 시작 저장");
  }

  const sleepStatusStart = editingEvent?.eventType === "sleep" ? occurredAt : ongoingSleep?.occurredAt ?? occurredAt;
  const isEditingSleep = editingEvent?.eventType === "sleep";
  const isEditingLatestSleep =
    isEditingSleep && latestSleepEventId !== null && editingEvent.id === latestSleepEventId;
  const sleepStatusTitle =
    eventType === "sleep" && ongoingSleep && !editingEvent
      ? `${getSleepDuration(ongoingSleep.occurredAt, now)}째 수면 중`
      : isEditingSleep
        ? endedAt
          ? "수면 기록"
          : `${getSleepDuration(occurredAt, now)}째 수면 중`
        : "깨어 있음";
  const sleepStatusDescription =
    eventType === "sleep" && ongoingSleep && !editingEvent
      ? `${formatTime(sleepStatusStart)} 시작 · 예상 기상 ${formatTime(new Date(new Date(sleepStatusStart).getTime() + 90 * 60000).toISOString())}`
      : isEditingSleep
        ? endedAt
          ? `${formatTime(occurredAt)} 시작 · ${formatTime(endedAt)} 종료`
          : `${formatTime(occurredAt)} 시작`
        : "재우기 시작하면 시간이 자동 기록돼요.";
  const saveButtonLabel = isSubmitting
    ? "저장 중..."
    : editingEvent
      ? "수정하기"
      : eventType === "memo"
        ? "메모 저장"
        : eventType === "play"
          ? "놀이 저장"
        : "바로 기록하기";
  const sleepSaveButtonLabel = isSubmitting
    ? "저장 중..."
    : isEditingSleep && !isEditingLatestSleep
      ? "수면 기록 수정"
      : ongoingSleep || (isEditingSleep && !endedAt)
        ? "수면 종료"
        : isEditingSleep
          ? "수면 기록 수정"
          : "수면 시작";

  return (
    <section className="screen-stack action-screen">
      <section className={`panel quick-action-card ${eventType}`}>
        <div className={eventType === "sleep" ? "sleep-status-card" : "quick-status"}>
          {eventType === "feed" ? (
            <>
              <strong>{amountMl}ml</strong>
              <small>
                {recentFeedAverage ? `최근 평균 ${recentFeedAverage}ml` : "빠른 버튼으로 수유량을 선택해요"}
                {feedDiff !== null ? ` · 이전보다 ${Math.abs(feedDiff)}ml ${feedDiff >= 0 ? "많아요" : "적어요"}` : ""}
              </small>
            </>
          ) : null}
          {eventType === "sleep" ? (
            <>
              <strong>{sleepStatusTitle}</strong>
              <small>{sleepStatusDescription}</small>
            </>
          ) : null}
          {eventType === "diaper" ? (
            <>
              <strong>{diaperOptions.find((item) => item.value === diaperType)?.label}</strong>
              <small>기저귀 상태를 한 번에 기록해요.</small>
            </>
          ) : null}
          {eventType === "medicine" ? (
            <>
              <strong>약 복용</strong>
              <small>약 이름, 용량, 다음 복용 예정까지 기록할 수 있어요.</small>
            </>
          ) : null}
          {eventType === "temperature" ? (
            <>
              <strong>{temperatureC.toFixed(1)}도</strong>
              <small>{temperatureC >= 38 ? "고열 경향" : temperatureC >= 37.5 ? "미열 경향" : "정상 범위 경향"}</small>
            </>
          ) : null}
          {eventType === "meal" ? (
            <>
              <strong>{mealAmountG}g</strong>
              <small>이유식 종류와 반응을 함께 남겨요.</small>
            </>
          ) : null}
          {eventType === "memo" ? (
            <>
              <strong>메모</strong>
              <small>홈에서 남긴 메모를 수정할 수 있어요.</small>
            </>
          ) : null}
          {eventType === "bath" ? (
            <>
              <strong>목욕</strong>
              <small>목욕한 날짜와 시간을 기록해요.</small>
            </>
          ) : null}
          {eventType === "play" ? (
            <>
              <strong>놀이</strong>
              <small>놀이 시간과 내용을 함께 남겨요.</small>
            </>
          ) : null}
        </div>

        {eventType === "feed" ? (
          <>
            <div className="quick-chip-row" aria-label="빠른 수유량">
              {feedQuickAmounts.map((amount) => (
                <button className={amountMl === amount ? "active" : ""} key={amount} type="button" onClick={() => setAmountMl(amount)}>
                  {amount}
                </button>
              ))}
            </div>
            <div className="amount-stepper" aria-label="수유량">
              <button type="button" onClick={() => setAmountMl((current) => Math.max(0, current - 10))}>-10</button>
              <strong>{amountMl}ml</strong>
              <button type="button" onClick={() => setAmountMl((current) => Math.min(300, current + 10))}>+10</button>
            </div>
          </>
        ) : null}

        {eventType === "diaper" ? (
          <div className="quick-poop-row">
            <div className="choice-grid">
              {diaperOptions.map((option) => (
                <button className={diaperType === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setDiaperType(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
            {diaperType !== "wet" ? (
              <>
                <div className="choice-grid">
                  {poopAmounts.map((option) => (
                    <button className={poopAmount === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setPoopAmount(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="color-grid">
                  {poopColors.map((option) => (
                    <button className={poopColor === option.value ? "active" : ""} aria-label={option.label} key={option.value} type="button" onClick={() => setPoopColor(option.value)}>
                      <i className={option.className} />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {eventType === "medicine" ? (
          <div className="stacked-fields">
            <label className="medicine-name-field">
              <span>약 이름</span>
              <input required value={medicineName} onChange={(event) => setMedicineName(event.target.value)} placeholder="예: 비타민 D" />
            </label>
            <label className="medicine-name-field">
              <span>용량</span>
              <input value={medicineDose} onChange={(event) => setMedicineDose(event.target.value)} placeholder="예: 1방울, 2.5ml" />
            </label>
            <label className="medicine-name-field">
              <span>다음 복용 예정</span>
              <input type="datetime-local" value={medicineNextAt} onChange={(event) => setMedicineNextAt(event.target.value)} />
            </label>
          </div>
        ) : null}

        {eventType === "temperature" ? (
          <div className="stacked-fields">
            <label className="medicine-name-field">
              <span>체온</span>
              <input type="number" step="0.1" min="34" max="43" value={temperatureC} onChange={(event) => setTemperatureC(Number(event.target.value))} />
            </label>
            <div className="choice-grid">
              {temperatureLocations.map((option) => (
                <button className={temperatureLocation === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setTemperatureLocation(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {eventType === "meal" ? (
          <div className="stacked-fields">
            <label className="medicine-name-field">
              <span>종류</span>
              <input required value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="예: 쌀미음" />
            </label>
            <label className="medicine-name-field">
              <span>양(g)</span>
              <input type="number" min="0" max="500" value={mealAmountG} onChange={(event) => setMealAmountG(Number(event.target.value))} />
            </label>
            <div className="choice-grid">
              {mealReactions.map((option) => (
                <button className={mealReaction === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setMealReaction(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
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
                placeholder="메모를 입력해 주세요"
              />
            </label>
          </div>
        ) : null}

        {eventType === "play" ? (
          <div className="stacked-fields">
            <label className="medicine-name-field">
              <span>무엇을 하고 놀았나요?</span>
              <textarea
                rows={3}
                value={memoText}
                onChange={(event) => setMemoText(event.target.value)}
                placeholder="예: 터미타임, 모빌 보기, 책 읽기"
              />
            </label>
          </div>
        ) : null}

        {eventType === "sleep" || eventType === "play" ? (
          <div className="sleep-time-editor" aria-label={eventType === "play" ? "놀이 시간 입력" : "수면 시간 입력"}>
            <label>
              <span>시작 날짜</span>
              <input type="date" value={quickDate} onChange={(event) => handleQuickDateChange(event.target.value)} />
            </label>
            <label>
              <span>시작 시간</span>
              <input type="time" value={quickTime} onChange={(event) => handleQuickTimeChange(event.target.value)} />
            </label>
            <label>
              <span>종료 날짜</span>
              <input type="date" value={endedDate} onChange={(event) => handleEndedDateChange(event.target.value)} />
            </label>
            <label>
              <span>종료 시간</span>
              <input type="time" value={endedTime} onChange={(event) => handleEndedTimeChange(event.target.value)} />
            </label>
          </div>
        ) : (
          <div className="quick-time-card" aria-label="기록 시간">
            <label>
              <span>날짜</span>
              <input type="date" value={quickDate} onChange={(event) => handleQuickDateChange(event.target.value)} />
            </label>
            <label>
              <span>시간</span>
              <input type="time" value={quickTime} onChange={(event) => handleQuickTimeChange(event.target.value)} />
            </label>
          </div>
        )}

        <div className="quick-button-row">
          {eventType === "feed" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleQuickFeed()}>
              {isSubmitting ? "저장 중..." : editingEvent ? "수정하기" : "수유 기록하기"}
            </button>
          ) : null}
          {eventType === "sleep" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void handleSleepSave()}>
              {sleepSaveButtonLabel}
            </button>
          ) : null}
          {eventType !== "feed" && eventType !== "sleep" ? (
            <button className="primary-button quick-save-button" disabled={isSubmitting} type="button" onClick={() => void submitQuick(buildCurrentInput(), editingEvent ? "수정했어요" : "저장했어요")}>
              {saveButtonLabel}
            </button>
          ) : null}
        </div>

      </section>

      {toastMessage ? <div className="toast-message">{toastMessage}</div> : null}
      <AdBanner placement="activity-bottom" />
    </section>
  );
}
