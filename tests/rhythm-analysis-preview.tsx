// Development-only fixture. Uses the production rhythm component with in-memory sample events.
import React from "react";
import { createRoot } from "react-dom/client";
import { RhythmAnalysisCards } from "../src/components/RhythmAnalysisCards";
import type { BabyEvent, EventType, FeedingMethod } from "../src/types";
import "../src/styles.css";
import "./rhythm-analysis-preview.css";

let eventId = 0;
function dateAt(dayOffset: number, hour: number, minute = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute).toISOString();
}

function dateAfter(dayOffset: number, hour: number, durationMinutes: number) {
  return new Date(new Date(dateAt(dayOffset, hour)).getTime() + durationMinutes * 60000).toISOString();
}

function event(dayOffset: number, eventType: EventType, hour: number, extra: Partial<BabyEvent> = {}): BabyEvent {
  eventId += 1;
  return {
    id: `preview-${eventId}`,
    userId: "preview-user",
    babyId: "preview-baby",
    eventType,
    occurredAt: dateAt(dayOffset, hour),
    createdAt: dateAt(dayOffset, hour),
    ...extra,
  };
}

function feed(dayOffset: number, hour: number, method: FeedingMethod, amount: number): BabyEvent {
  return event(dayOffset, "feed", hour, method === "bottle"
    ? { feedingMethod: method, amountMl: amount }
    : { feedingMethod: method, breastLeftMinutes: Math.ceil(amount / 2), breastRightMinutes: Math.floor(amount / 2) });
}

const sampleEvents: BabyEvent[] = Array.from({ length: 7 }, (_, index) => {
  const dayOffset = index - 6;
  const bottleAmount = [110, 120, 115, 105, 118, 125, 120][index];
  const breastMinutes = [18, 20, 16, 23, 19, 21, 20][index];
  const mealAmount = [80, 90, 95, 92, 100, 105, 102][index];
  const sleepMinutes = [390, 402, 395, 340, 380, 408, 400][index];
  return [
    feed(dayOffset, 7, "bottle", bottleAmount),
    feed(dayOffset, 10, "bottle", bottleAmount),
    feed(dayOffset, 8, "breast", breastMinutes),
    feed(dayOffset, 11, "breast", breastMinutes),
    event(dayOffset, "meal", 9, { mealAmountG: mealAmount }),
    event(dayOffset, "meal", 13, { mealAmountG: mealAmount }),
    event(dayOffset, "sleep", 12, { endedAt: dateAfter(dayOffset, 12, Math.floor(sleepMinutes / 2)) }),
    event(dayOffset, "sleep", 18, { endedAt: dateAfter(dayOffset, 18, Math.ceil(sleepMinutes / 2)) }),
  ];
}).flat();
const previewParams = new URLSearchParams(window.location.search);
const previewEvents = previewParams.has("empty")
  ? []
  : previewParams.has("withoutBreast")
    ? sampleEvents.filter((item) => item.eventType !== "feed" || item.feedingMethod !== "breast")
    : sampleEvents;

function Preview() {
  return (
    <div className="rhythm-preview-shell">
      <RhythmAnalysisCards events={previewEvents} />
      <nav className="rhythm-preview-tabs" aria-label="하단 탭 미리보기">
        <button type="button"><img src="/icons/home.svg" alt="" />홈</button>
        <button type="button" className="active"><img src="/icons/pattern.svg" alt="" />리듬</button>
        <button type="button"><img src="/icons/grow-up.svg" alt="" />성장</button>
        <button type="button"><img src="/icons/profile.svg" alt="" />프로필</button>
      </nav>
    </div>
  );
}

const rootElement = document.getElementById("root")! as HTMLElement & {
  rhythmPreviewRoot?: ReturnType<typeof createRoot>;
};
const root = rootElement.rhythmPreviewRoot ?? createRoot(rootElement);
rootElement.rhythmPreviewRoot = root;
root.render(<Preview />);
