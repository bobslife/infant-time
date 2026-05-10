import { lazy, Suspense, useEffect, useRef, useState, type TouchEvent } from "react";
import { BabySetup } from "./components/BabySetup";
import { EventInputScreen } from "./components/EventInputScreen";
import { EventList } from "./components/EventList";
import { LoginScreen } from "./components/LoginScreen";
import { OfflineFallbackScreen } from "./components/OfflineFallbackScreen";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { ProfileScreen } from "./components/ProfileScreen";
import { RequiredUpdateScreen } from "./components/RequiredUpdateScreen";
import { SupportPage } from "./components/SupportPage";
import { AnalysisCards, SummaryCards } from "./components/SummaryCards";
import { useAppUpdateGate } from "./features/app/useAppUpdateGate";
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
const PULL_REFRESH_THRESHOLD = 84;
const MAX_PULL_DISTANCE = 112;
const PULL_FRICTION = 0.45;
const GrowthScreen = lazy(() =>
  import("./components/GrowthScreen").then((module) => ({ default: module.GrowthScreen })),
);
const rawAdMode = String(import.meta.env.VITE_AD_MODE ?? import.meta.env.NEXT_PUBLIC_AD_MODE ?? "mock")
  .trim()
  .toLowerCase();
const isAdMobMode = rawAdMode === "admob";

function getFeedIntervalStorageKey(babyId: string) {
  return `infant-time-feed-interval-${babyId}`;
}

export function App() {
  if (window.location.pathname === "/privacy") {
    return <PrivacyPolicy />;
  }

  if (window.location.pathname === "/support") {
    return <SupportPage />;
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
    refreshData,
  } = useEvents();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [editingEvent, setEditingEvent] = useState<BabyEvent | null>(null);
  const [inputEventType, setInputEventType] = useState<EventType>("feed");
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedIntervalMinutes, setFeedIntervalMinutes] = useState(DEFAULT_FEED_INTERVAL_MINUTES);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pullDistanceRef = useRef(0);
  const pullActiveRef = useRef(false);
  const appUpdate = useAppUpdateGate();

  useEffect(() => {
    void import("./components/GrowthScreen").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setActiveTab("home");
    setEditingEvent(null);
    setInputEventType("feed");
  }, [user?.id]);

  useEffect(() => {
    if (!saveToastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSaveToastMessage(null), 1000);
    return () => window.clearTimeout(timer);
  }, [saveToastMessage]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
    completeEventSave();
  }

  async function handleUpdateEventFromInput(input: Parameters<typeof updateEvent>[0]) {
    await updateEvent(input);
    setEditingEvent(null);
    completeEventSave();
  }

  function completeEventSave() {
    setEditingEvent(null);
    setActiveTab("home");
    setSaveToastMessage("저장이 완료되었습니다.");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleEditEvent(event: BabyEvent) {
    setEditingEvent(event);
    setInputEventType(event.eventType === "pee" || event.eventType === "poop" ? "diaper" : event.eventType);
    setActiveTab("input");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleStartNewEvent(eventType: EventType) {
    setEditingEvent(null);
    setInputEventType(eventType);
    setActiveTab("input");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleQuickAdd(eventType: EventType) {
    setEditingEvent(null);
    setInputEventType(eventType);
    setActiveTab("input");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  function resetPullState() {
    touchStartRef.current = null;
    pullDistanceRef.current = 0;
    pullActiveRef.current = false;
    setPullDistance(0);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (isRefreshing || event.touches.length !== 1 || window.scrollY > 0) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    pullActiveRef.current = true;
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (!pullActiveRef.current || !touchStartRef.current || event.touches.length !== 1) {
      return;
    }

    if (window.scrollY > 0) {
      resetPullState();
      return;
    }

    const touch = event.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);

    if (deltaY <= 0 || deltaX > deltaY) {
      resetPullState();
      return;
    }

    event.preventDefault();

    const nextDistance = Math.min(Math.round(deltaY * PULL_FRICTION), MAX_PULL_DISTANCE);
    pullDistanceRef.current = nextDistance;
    setPullDistance(nextDistance);
  }

  function handleTouchEnd() {
    if (!pullActiveRef.current) {
      return;
    }

    const shouldRefresh = pullDistanceRef.current >= PULL_REFRESH_THRESHOLD;
    resetPullState();

    if (!shouldRefresh) {
      return;
    }

    void (async () => {
      setIsRefreshing(true);
      try {
        await refreshData();
      } finally {
        setIsRefreshing(false);
      }
    })();
  }

  if (appUpdate.isRequired) {
    return (
      <RequiredUpdateScreen
        currentVersion={appUpdate.currentVersion}
        updateUrl={appUpdate.updateUrl}
      />
    );
  }

  if (isLoading) {
    return (
      <main className="loading-shell" aria-label="Infant Time">
        <img className="loading-logo" src="/infant-time-logo.png" alt="Infant Time" />
      </main>
    );
  }

  if (!isOnline) {
    return <OfflineFallbackScreen onLocalPreview={useLocalPreview} onRetry={() => window.location.reload()} />;
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

  const genderThemeClass = baby.gender === "girl" ? "app-shell-girl" : "app-shell-boy";

  return (
    <main
      className={`app-shell ${genderThemeClass}${isAdMobMode ? " app-shell-admob" : ""}${isRefreshing ? " refreshing" : ""}`}
      onTouchCancel={handleTouchEnd}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`pull-refresh-indicator${pullDistance > 0 || isRefreshing ? " visible" : ""}${isRefreshing ? " refreshing" : ""}`}
        style={{
          transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 16)}px)`,
        }}
      >
        {isRefreshing ? "새로고침 중..." : pullDistance >= PULL_REFRESH_THRESHOLD ? "놓으면 새로고침" : "당겨서 새로고침"}
      </div>
      {saveToastMessage ? <div className="app-save-toast">{saveToastMessage}</div> : null}
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
          <section className="screen-stack">
            <EventInputScreen
              baby={baby}
              editingEvent={editingEvent}
              events={events}
              initialEventType={inputEventType}
              onSubmit={handleAddEvent}
              onUpdateEvent={handleUpdateEventFromInput}
              onStartNewEvent={handleStartNewEvent}
            />
          </section>
        ) : null}
        {activeTab === "analysis" ? (
          <section className="screen-stack">
            <AnalysisCards
              events={events}
              selectedDate={analysisDate}
              summary={buildDailySummary(events, analysisDate)}
              onDateChange={setAnalysisDate}
            />
          </section>
        ) : null}
        {activeTab === "growth" ? (
          <section className="screen-stack">
            <Suspense fallback={<p className="empty-copy">성장 기록을 불러오는 중입니다.</p>}>
              <GrowthScreen baby={baby} />
            </Suspense>
          </section>
        ) : null}
        {activeTab === "profile" ? (
          <section className="screen-stack">
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
          </section>
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
