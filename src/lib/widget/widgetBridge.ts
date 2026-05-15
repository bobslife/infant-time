import { Capacitor, registerPlugin } from "@capacitor/core";
import type { EventSummary } from "../../features/events/useEvents";
import type { BabyEvent } from "../../types";
import { formatTime } from "../time";

type WidgetSummaryPayload = {
  feedingMl: number;
  sleepMinutes: number;
  lastFeedAt: string | null;
  lastFeedAmountMl: number | null;
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

export function buildWidgetSummary(summary: EventSummary, events: BabyEvent[]) {
  const latestEvent = events[0] ?? null;

  return {
    feedingMl: summary.todayFeedTotalMl,
    sleepMinutes: summary.todaySleepMinutes,
    lastFeedAt: summary.lastFeedAt,
    lastFeedAmountMl: summary.lastFeedAmountMl,
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

export async function syncWidgetSummary(summary: EventSummary, events: BabyEvent[]) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return;
  }

  const payload = buildWidgetSummary(summary, events);
  const signature = JSON.stringify({
    feedingMl: payload.feedingMl,
    sleepMinutes: payload.sleepMinutes,
    lastFeedAt: payload.lastFeedAt,
    lastFeedAmountMl: payload.lastFeedAmountMl,
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
