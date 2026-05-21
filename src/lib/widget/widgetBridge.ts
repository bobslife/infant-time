import { Capacitor, registerPlugin } from "@capacitor/core";
import type { EventSummary } from "../../features/events/useEvents";
import type { BabyEvent, BabyProfile } from "../../types";
import { formatTime } from "../time";

type WidgetSummaryPayload = {
  babyName: string;
  babyBirthDate: string;
  babyGender: BabyProfile["gender"];
  feedIntervalMinutes: number;
  feedingMl: number;
  sleepMinutes: number;
  lastFeedAt: string | null;
  lastFeedAmountMl: number | null;
  lastMealAt: string | null;
  lastMealName: string | null;
  mealTotalG: number;
  activeSleepStartedAt: string | null;
  awakeStartedAt: string | null;
  diaperCount: number;
  mealCount: number;
  playMinutes: number;
  medicineCount: number;
  temperatureCount: number;
  lastEventLabel: string;
  lastEventTime: string;
  updatedAt: string;
};

interface WidgetBridgePlugin {
  saveSummary(options: { summary: WidgetSummaryPayload }): Promise<void>;
  clearSummary(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

let lastPayloadSignature: string | null = null;

function getEventLabel(event: BabyEvent | null): string {
  if (!event) {
    return "기록 없음";
  }

  const labelMap: Record<string, string> = {
    feed: "수유",
    sleep: "수면",
    diaper: "기저귀",
    pee: "기저귀",
    poop: "기저귀",
    medicine: "약",
    temperature: "체온",
    meal: "이유식",
    bath: "목욕",
    play: "놀이",
    memo: "메모",
  };

  return labelMap[event.eventType] ?? "기록";
}

function getAwakeStartedAt(events: BabyEvent[]): string | null {
  const lastFinishedSleep = events.find((event) => event.eventType === "sleep" && event.endedAt);
  return lastFinishedSleep?.endedAt ?? null;
}

function getLastMealName(events: BabyEvent[], lastMealAt: string | null): string | null {
  const lastMeal = events.find(
    (event) => event.eventType === "meal" && (!lastMealAt || event.occurredAt === lastMealAt),
  );
  const mealName = lastMeal?.mealName?.trim();
  return mealName || null;
}

export function buildWidgetSummary(
  summary: EventSummary,
  events: BabyEvent[],
  baby: BabyProfile,
  feedIntervalMinutes: number,
) {
  const latestEvent = events[0] ?? null;

  return {
    babyName: baby.name,
    babyBirthDate: baby.birthDate,
    babyGender: baby.gender,
    feedIntervalMinutes,
    feedingMl: summary.todayFeedTotalMl,
    sleepMinutes: summary.todaySleepMinutes,
    lastFeedAt: summary.lastFeedAt,
    lastFeedAmountMl: summary.lastFeedAmountMl,
    lastMealAt: summary.lastMealAt,
    lastMealName: getLastMealName(events, summary.lastMealAt),
    mealTotalG: summary.todayMealTotalG,
    activeSleepStartedAt: summary.activeSleepStartedAt,
    awakeStartedAt: summary.activeSleepStartedAt ? null : getAwakeStartedAt(events),
    diaperCount: summary.todayDiaperCount,
    mealCount: summary.todayMealCount,
    playMinutes: summary.todayPlayMinutes,
    medicineCount: summary.todayMedicineCount,
    temperatureCount: summary.todayTemperatureCount,
    lastEventLabel: getEventLabel(latestEvent),
    lastEventTime: latestEvent ? formatTime(latestEvent.occurredAt) : "-",
    updatedAt: new Date().toISOString(),
  } satisfies WidgetSummaryPayload;
}

export async function syncWidgetSummary(
  summary: EventSummary,
  events: BabyEvent[],
  baby: BabyProfile,
  feedIntervalMinutes: number,
) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return;
  }

  const payload = buildWidgetSummary(summary, events, baby, feedIntervalMinutes);
  const signature = JSON.stringify({
    babyName: payload.babyName,
    babyBirthDate: payload.babyBirthDate,
    babyGender: payload.babyGender,
    feedIntervalMinutes: payload.feedIntervalMinutes,
    feedingMl: payload.feedingMl,
    sleepMinutes: payload.sleepMinutes,
    lastFeedAt: payload.lastFeedAt,
    lastFeedAmountMl: payload.lastFeedAmountMl,
    lastMealAt: payload.lastMealAt,
    lastMealName: payload.lastMealName,
    mealTotalG: payload.mealTotalG,
    activeSleepStartedAt: payload.activeSleepStartedAt,
    awakeStartedAt: payload.awakeStartedAt,
    diaperCount: payload.diaperCount,
    mealCount: payload.mealCount,
    playMinutes: payload.playMinutes,
    medicineCount: payload.medicineCount,
    temperatureCount: payload.temperatureCount,
    lastEventLabel: payload.lastEventLabel,
    lastEventTime: payload.lastEventTime,
  });

  if (signature === lastPayloadSignature) {
    return;
  }

  lastPayloadSignature = signature;
  await WidgetBridge.saveSummary({ summary: payload });
}

export async function clearWidgetSummary() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return;
  }

  lastPayloadSignature = null;
  await WidgetBridge.clearSummary();
}
