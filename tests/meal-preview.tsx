// Development-only fixture. Never reads or writes account data.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { EventInputScreen } from "../src/components/EventInputScreen";
import { EventList } from "../src/components/EventList";
import { SummaryCards } from "../src/components/SummaryCards";
import { buildSummary } from "../src/features/events/useEvents";
import type { BabyEvent, CreateEventInput, EventType } from "../src/types";
import "../src/styles.css";
const baby = { id: "meal-ui-test", ownerId: "test", name: "미리보기", birthDate: "2026-01-01", gender: "girl" as const, inviteCode: "test", createdAt: new Date().toISOString() };
function Preview() {
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [initialType, setInitialType] = useState<EventType>("meal");
  const [editing, setEditing] = useState<BabyEvent | null>(null);
  const [view, setView] = useState<"input" | "records" | "home">("input");
  const save = async (input: CreateEventInput & { id?: string }) => {
    const event = { ...input, id: input.id ?? crypto.randomUUID(), userId: "test", createdAt: new Date().toISOString() };
    setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)]);
    setView("records");
  };
  return <div className="app-shell"><div className="page-frame">
    <nav className="choice-grid"><button onClick={() => { setEditing(null); setInitialType("meal"); setView("input"); }}>입력 확인</button><button onClick={() => setView("records")}>기록 확인</button><button onClick={() => setView("home")}>빈 홈 확인</button></nav>
    {view === "input" ? <EventInputScreen baby={baby} events={events} editingEvent={editing} initialEventType={initialType} hideAds onSubmit={save} onUpdateEvent={save} /> : null}
    {view === "records" ? <EventList events={events} onEdit={(event) => { setEditing(event); setView("input"); }} onDelete={async (event) => setEvents((current) => current.filter((item) => item.id !== event.id))} /> : null}
    {view === "home" ? <SummaryCards baby={baby} events={events} summary={buildSummary(events)} previewEmptyIntake feedIntervalMinutes={180} onFeedIntervalChange={() => {}} onQuickAdd={(type) => {setEditing(null); setInitialType(type); setView("input");}} onWakeSleep={() => {}} onEndPlay={() => {}} /> : null}
  </div></div>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
