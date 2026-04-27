import { useState } from "react";
import { BabySetup } from "./components/BabySetup";
import { EventInputScreen } from "./components/EventInputScreen";
import { EventList } from "./components/EventList";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { AnalysisCards, SummaryCards } from "./components/SummaryCards";
import { buildDailySummary, useEvents } from "./features/events/useEvents";
import { BabyEvent, EventType } from "./types";

type AppTab = "home" | "input" | "analysis" | "profile";

const tabs: Array<{ id: AppTab; icon: string; label: string }> = [
  { id: "home", icon: "/icons/home.svg", label: "홈" },
  { id: "input", icon: "/icons/action.svg", label: "활동" },
  { id: "analysis", icon: "/icons/analysis.svg", label: "분석" },
  { id: "profile", icon: "/icons/profile.svg", label: "프로필" },
];

export function App() {
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
    createBaby,
    joinBaby,
    selectBaby,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [editingEvent, setEditingEvent] = useState<BabyEvent | null>(null);
  const [inputEventType, setInputEventType] = useState<EventType>("feed");
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));

  async function handleAddEvent(input: Parameters<typeof addEvent>[0]) {
    if (editingEvent) {
      await updateEvent({ ...input, id: editingEvent.id });
      setEditingEvent(null);
    } else {
      await addEvent(input);
    }
    setActiveTab("home");
  }

  function handleEditEvent(event: BabyEvent) {
    setEditingEvent(event);
    setActiveTab("input");
  }

  function handleQuickAdd(eventType: EventType) {
    setEditingEvent(null);
    setInputEventType(eventType);
    setActiveTab("input");
  }

  function handleTabChange(tab: AppTab) {
    if (tab !== "input") {
      setEditingEvent(null);
    }

    if (tab === "input") {
      setInputEventType("feed");
    }

    setActiveTab(tab);
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
            <SummaryCards baby={baby} summary={summary} onQuickAdd={handleQuickAdd} />
            <EventList events={events} onDelete={deleteEvent} onEdit={handleEditEvent} />
          </section>
        ) : null}
        {activeTab === "input" ? (
          <EventInputScreen
            baby={baby}
            editingEvent={editingEvent}
            initialEventType={inputEventType}
            onSubmit={handleAddEvent}
          />
        ) : null}
        {activeTab === "analysis" ? (
          <AnalysisCards
            selectedDate={analysisDate}
            summary={buildDailySummary(events, analysisDate)}
            onDateChange={setAnalysisDate}
          />
        ) : null}
        {activeTab === "profile" ? (
          <ProfileScreen
            babies={babies}
            baby={baby}
            user={user}
            onCreateBaby={createBaby}
            onJoinBaby={joinBaby}
            onSelectBaby={selectBaby}
            onSignOut={signOut}
          />
        ) : null}
      </div>
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
