import { lazy, Suspense, useEffect, useState } from "react";
import { BabySetup } from "./components/BabySetup";
import { EventInputScreen } from "./components/EventInputScreen";
import { EventList } from "./components/EventList";
import { LoginScreen } from "./components/LoginScreen";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { ProfileScreen } from "./components/ProfileScreen";
import { QuickEntrySheet } from "./components/quick-entry/QuickEntrySheet";
import { AnalysisCards, SummaryCards } from "./components/SummaryCards";
import { buildDailySummary, useEvents } from "./features/events/useEvents";
import { BabyEvent, EventType } from "./types";

type AppTab = "home" | "input" | "analysis" | "growth" | "profile";

const tabs: Array<{ id: AppTab; icon: string; label: string }> = [
  { id: "home", icon: "/icons/home.svg", label: "홈" },
  { id: "input", icon: "/icons/action.svg", label: "활동" },
  { id: "analysis", icon: "/icons/analysis.svg", label: "분석" },
  { id: "growth", icon: "/icons/grow-up.svg", label: "성장" },
  { id: "profile", icon: "/icons/profile.svg", label: "프로필" },
];

const DEFAULT_FEED_INTERVAL_MINUTES = 180;
const GrowthScreen = lazy(() =>
  import("./components/GrowthScreen").then((module) => ({ default: module.GrowthScreen })),
);

function getFeedIntervalStorageKey(babyId: string) {
  return `infant-time-feed-interval-${babyId}`;
}

export function App() {
  if (window.location.pathname === "/privacy") {
    return <PrivacyPolicy />;
  }

  const {
    user,
    babies,
    baby,
    events,
    isLoading,
    errorMessage,
    summary,
    hasSupabase,
    signUp,
    signIn,
    useLocalPreview,
    signOut,
    deleteAccount,
    createBaby,
    updateBaby,
    joinBaby,
    selectBaby,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [editingEvent, setEditingEvent] = useState<BabyEvent | null>(null);
  const [inputEventType, setInputEventType] = useState<EventType>("feed");
  const [quickEntryType, setQuickEntryType] = useState<EventType | null>(null);
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedIntervalMinutes, setFeedIntervalMinutes] = useState(DEFAULT_FEED_INTERVAL_MINUTES);

  useEffect(() => {
    if (!user) {
      return;
    }

    setActiveTab("home");
    setEditingEvent(null);
    setInputEventType("feed");
  }, [user?.id]);

  useEffect(() => {
    if (!baby) {
      return;
    }

    const saved = window.localStorage.getItem(getFeedIntervalStorageKey(baby.id));
    const parsed = saved ? Number(saved) : DEFAULT_FEED_INTERVAL_MINUTES;
    setFeedIntervalMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FEED_INTERVAL_MINUTES);
  }, [baby]);

  function handleFeedIntervalChange(nextMinutes: number) {
    if (!baby) {
      return;
    }

    const safeMinutes = Math.max(30, Math.min(720, nextMinutes));
    setFeedIntervalMinutes(safeMinutes);
    window.localStorage.setItem(getFeedIntervalStorageKey(baby.id), String(safeMinutes));
  }

  async function handleAddEvent(input: Parameters<typeof addEvent>[0]) {
    await addEvent(input);
  }

  async function handleUpdateEventFromInput(input: Parameters<typeof updateEvent>[0]) {
    await updateEvent(input);
    setEditingEvent(null);
    setActiveTab("home");
  }

  function handleEditEvent(event: BabyEvent) {
    setEditingEvent(event);
    setInputEventType(event.eventType === "pee" || event.eventType === "poop" ? "diaper" : event.eventType);
    setQuickEntryType(null);
    setActiveTab("input");
  }

  function handleQuickAdd(eventType: EventType) {
    setEditingEvent(null);
    setQuickEntryType(eventType);
  }

  function handleTabChange(tab: AppTab) {
    if (tab !== "input") {
      setEditingEvent(null);
    }

    if (tab === "input") {
      setInputEventType("feed");
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  if (isLoading) {
    return (
      <main className="loading-shell" aria-label="Infant Time">
        <img className="loading-logo" src="/infant-time-log.png" alt="Infant Time" />
      </main>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        errorMessage={errorMessage}
        hasSupabase={hasSupabase}
        onSignUp={signUp}
        onSignIn={signIn}
        onLocalPreview={useLocalPreview}
      />
    );
  }

  if (!baby) {
    return <BabySetup errorMessage={errorMessage} onSubmit={createBaby} onJoin={joinBaby} />;
  }

  return (
    <main className="app-shell">
      <div className="page-frame">
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        {activeTab === "home" ? (
          <section className="screen-stack">
            <SummaryCards
              baby={baby}
              events={events}
              feedIntervalMinutes={feedIntervalMinutes}
              summary={summary}
              onFeedIntervalChange={handleFeedIntervalChange}
              onQuickAdd={handleQuickAdd}
            />
            <EventList events={events} onDelete={deleteEvent} onEdit={handleEditEvent} />
          </section>
        ) : null}
        {activeTab === "input" ? (
          <EventInputScreen
            baby={baby}
            editingEvent={editingEvent}
            events={events}
            initialEventType={inputEventType}
            onSubmit={handleAddEvent}
            onUpdateEvent={handleUpdateEventFromInput}
          />
        ) : null}
        {activeTab === "analysis" ? (
          <AnalysisCards
            events={events}
            selectedDate={analysisDate}
            summary={buildDailySummary(events, analysisDate)}
            onDateChange={setAnalysisDate}
          />
        ) : null}
        {activeTab === "growth" ? (
          <Suspense fallback={<p className="empty-copy">성장 기록을 불러오는 중입니다.</p>}>
            <GrowthScreen baby={baby} />
          </Suspense>
        ) : null}
        {activeTab === "profile" ? (
          <ProfileScreen
            babies={babies}
            baby={baby}
            user={user}
            onCreateBaby={createBaby}
            onUpdateBaby={updateBaby}
            onJoinBaby={joinBaby}
            onSelectBaby={selectBaby}
            onSignOut={signOut}
            onDeleteAccount={deleteAccount}
          />
        ) : null}
      </div>
      <QuickEntrySheet
        baby={baby}
        eventType={quickEntryType}
        events={events}
        onClose={() => setQuickEntryType(null)}
        onSubmit={handleAddEvent}
        onUpdateEvent={updateEvent}
      />
      <nav className="bottom-tabs" aria-label="주요 메뉴">
        {tabs.map((tab) => (
          <button
            className={`tab-${tab.id}${activeTab === tab.id ? " active" : ""}`}
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
          >
            <img alt="" aria-hidden="true" src={tab.icon} />
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
