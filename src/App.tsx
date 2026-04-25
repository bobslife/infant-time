import { useState } from "react";
import { BabySetup } from "./components/BabySetup";
import { EventInputScreen } from "./components/EventInputScreen";
import { EventList } from "./components/EventList";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { AnalysisCards, SummaryCards } from "./components/SummaryCards";
import { buildDailySummary, useEvents } from "./features/events/useEvents";
import { BabyEvent } from "./types";

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
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [editingEvent, setEditingEvent] = useState<BabyEvent | null>(null);
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

  function handleTabChange(tab: AppTab) {
    if (tab !== "input") {
      setEditingEvent(null);
    }

    setActiveTab(tab);
  }

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Infant Time</p>
          <h1>불러오는 중입니다</h1>
        </section>
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
    return <BabySetup errorMessage={errorMessage} onSubmit={createBaby} />;
  }

  return (
    <main className="app-shell">
      <div className="page-frame">
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        {activeTab === "home" ? (
          <section className="screen-stack">
            <SummaryCards baby={baby} summary={summary} />
            <EventList events={events} onDelete={deleteEvent} onEdit={handleEditEvent} />
          </section>
        ) : null}
        {activeTab === "input" ? (
          <EventInputScreen baby={baby} editingEvent={editingEvent} onSubmit={handleAddEvent} />
        ) : null}
        {activeTab === "analysis" ? (
          <AnalysisCards
            selectedDate={analysisDate}
            summary={buildDailySummary(events, analysisDate)}
            onDateChange={setAnalysisDate}
          />
        ) : null}
        {activeTab === "profile" ? (
          <ProfileScreen baby={baby} user={user} onSignOut={signOut} />
        ) : null}
      </div>
      <nav className="bottom-tabs" aria-label="주요 메뉴">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
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
