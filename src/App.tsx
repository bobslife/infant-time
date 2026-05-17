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
import {
  checkApnsPermissionState,
  loadFeedingReminderInterval,
  registerApnsToken,
  saveFeedingReminderInterval,
  syncApnsTokenIfPermissionGranted,
} from "./lib/push/apns";
import { clearWidgetSummary, syncWidgetSummary } from "./lib/widget/widgetBridge";
import { BabyEvent, EventType } from "./types";

type AppTab = "home" | "analysis" | "pattern" | "growth" | "profile";

const tabs: Array<{ id: AppTab; icon: string; label: string }> = [
  { id: "home", icon: "/icons/home.svg", label: "홈" },
  { id: "pattern", icon: "/icons/pattern.svg", label: "패턴" },
  { id: "analysis", icon: "/icons/analysis.svg", label: "분석" },
  { id: "growth", icon: "/icons/grow-up.svg", label: "성장" },
  { id: "profile", icon: "/icons/profile.svg", label: "프로필" },
];

const DEFAULT_FEED_INTERVAL_MINUTES = 180;
const PUSH_PERMISSION_PROMPT_KEY = "infant-time-push-permission-prompt-feeding-reminder-v1";
const PULL_REFRESH_THRESHOLD = 84;
const MAX_PULL_DISTANCE = 112;
const PULL_FRICTION = 0.45;
const GrowthScreen = lazy(() =>
  import("./components/GrowthScreen").then((module) => ({ default: module.GrowthScreen })),
);
const PatternCards = lazy(() =>
  import("./components/PatternCards").then((module) => ({ default: module.PatternCards })),
);
const rawAdMode = String(import.meta.env.VITE_AD_MODE ?? import.meta.env.NEXT_PUBLIC_AD_MODE ?? "mock")
  .trim()
  .toLowerCase();
const isAdMobMode = rawAdMode === "admob";

type PushPermissionPromptMode = "permission" | "settings";

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
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedIntervalMinutes, setFeedIntervalMinutes] = useState(DEFAULT_FEED_INTERVAL_MINUTES);
  const [isFeedIntervalReady, setIsFeedIntervalReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const [pushPermissionPromptMode, setPushPermissionPromptMode] = useState<PushPermissionPromptMode | null>(null);
  const [isPushPermissionBusy, setIsPushPermissionBusy] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pullDistanceRef = useRef(0);
  const pullActiveRef = useRef(false);
  const pushRegistrationKeyRef = useRef<string | null>(null);
  const pushPermissionPromptKeyRef = useRef<string | null>(null);
  const appUpdate = useAppUpdateGate();

  useEffect(() => {
    void import("./components/GrowthScreen").catch(() => undefined);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("infant-time-admob-visibility", {
        detail: { hidden: isInputModalOpen || Boolean(pushPermissionPromptMode) },
      }),
    );
  }, [isInputModalOpen, pushPermissionPromptMode]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setActiveTab("home");
    setEditingEvent(null);
    setInputEventType("feed");
    setIsInputModalOpen(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !baby) {
      pushRegistrationKeyRef.current = null;
      pushPermissionPromptKeyRef.current = null;
      return;
    }

    if (!isFeedIntervalReady) {
      return;
    }

    const registrationKey = `${user.id}:${baby.id}`;
    if (pushRegistrationKeyRef.current === registrationKey) {
      return;
    }

    pushRegistrationKeyRef.current = registrationKey;
    void (async () => {
      const permissionState = await checkApnsPermissionState();
      if (permissionState === "unsupported") {
        return;
      }

      if (permissionState === "granted") {
        await syncApnsTokenIfPermissionGranted(user, baby);
        await saveFeedingReminderInterval(user, baby, feedIntervalMinutes);
        window.localStorage.setItem(PUSH_PERMISSION_PROMPT_KEY, "granted");
        setPushPermissionPromptMode(null);
        return;
      }

      if (window.localStorage.getItem(PUSH_PERMISSION_PROMPT_KEY)) {
        return;
      }

      if (pushPermissionPromptKeyRef.current === registrationKey) {
        return;
      }

      pushPermissionPromptKeyRef.current = registrationKey;
      setPushPermissionPromptMode(permissionState === "denied" ? "settings" : "permission");
    })().catch((error) => {
      console.warn("Failed to prepare APNs permission flow", error);
      pushRegistrationKeyRef.current = null;
    });
  }, [baby, feedIntervalMinutes, isFeedIntervalReady, user]);

  useEffect(() => {
    if (!saveToastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSaveToastMessage(null), 1000);
    return () => window.clearTimeout(timer);
  }, [saveToastMessage]);

  useEffect(() => {
    if (!isInputModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isInputModalOpen]);

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
      setFeedIntervalMinutes(DEFAULT_FEED_INTERVAL_MINUTES);
      setIsFeedIntervalReady(false);
      return;
    }

    let isCancelled = false;
    const saved = window.localStorage.getItem(getFeedIntervalStorageKey(baby.id));
    const parsed = saved ? Number(saved) : NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      const nextMinutes = Math.max(30, Math.min(720, Math.round(parsed)));
      setFeedIntervalMinutes(nextMinutes);
      setIsFeedIntervalReady(true);

      return () => {
        isCancelled = true;
      };
    }

    setIsFeedIntervalReady(false);
    void (async () => {
      try {
        const remoteMinutes = user ? await loadFeedingReminderInterval(user, baby) : null;
        const nextMinutes = remoteMinutes ?? DEFAULT_FEED_INTERVAL_MINUTES;

        if (isCancelled) {
          return;
        }

        setFeedIntervalMinutes(nextMinutes);
        setIsFeedIntervalReady(true);
        window.localStorage.setItem(getFeedIntervalStorageKey(baby.id), String(nextMinutes));

        if (user && remoteMinutes === null) {
          void saveFeedingReminderInterval(user, baby, nextMinutes).catch((error) => {
            console.warn("Failed to initialize feeding reminder interval", error);
          });
        }
      } catch (error) {
        console.warn("Failed to load feeding reminder interval", error);

        if (isCancelled) {
          return;
        }

        setFeedIntervalMinutes(DEFAULT_FEED_INTERVAL_MINUTES);
        setIsFeedIntervalReady(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [baby, user]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user || !baby) {
      void clearWidgetSummary().catch(() => undefined);
      return;
    }

    if (!isFeedIntervalReady) {
      return;
    }

    void syncWidgetSummary(summary, events, baby, feedIntervalMinutes).catch(() => undefined);
  }, [baby, events, feedIntervalMinutes, isFeedIntervalReady, isLoading, summary, user]);

  function handleFeedIntervalChange(nextMinutes: number) {
    if (!baby) {
      return;
    }

    const safeMinutes = Math.max(30, Math.min(720, nextMinutes));
    setFeedIntervalMinutes(safeMinutes);
    setIsFeedIntervalReady(true);
    window.localStorage.setItem(getFeedIntervalStorageKey(baby.id), String(safeMinutes));

    if (user) {
      void saveFeedingReminderInterval(user, baby, safeMinutes).catch((error) => {
        console.warn("Failed to save feeding reminder interval", error);
      });
    }
  }

  async function handleAllowPushPermission() {
    if (!user || !baby) {
      return;
    }

    setIsPushPermissionBusy(true);
    try {
      await registerApnsToken(user, baby);
      await saveFeedingReminderInterval(user, baby, feedIntervalMinutes);
      window.localStorage.setItem(PUSH_PERMISSION_PROMPT_KEY, "granted");
      setPushPermissionPromptMode(null);
      setSaveToastMessage("수유 알림을 켰어요.");
    } catch (error) {
      console.warn("Failed to register APNs token", error);
      const permissionState = await checkApnsPermissionState().catch(() => "denied" as const);
      if (permissionState === "denied") {
        setPushPermissionPromptMode("settings");
        return;
      }

      setSaveToastMessage("알림 설정을 완료하지 못했어요.");
    } finally {
      setIsPushPermissionBusy(false);
    }
  }

  function dismissPushPermissionPrompt() {
    window.localStorage.setItem(PUSH_PERMISSION_PROMPT_KEY, "dismissed");
    setPushPermissionPromptMode(null);
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
    setIsInputModalOpen(false);
    setSaveToastMessage("저장이 완료되었습니다.");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleEditEvent(event: BabyEvent) {
    setEditingEvent(event);
    setInputEventType(event.eventType === "pee" || event.eventType === "poop" ? "diaper" : event.eventType);
    setIsInputModalOpen(true);
  }

  function handleQuickAdd(eventType: EventType) {
    setEditingEvent(null);
    setInputEventType(eventType);
    setIsInputModalOpen(true);
  }

  function handleTabChange(tab: AppTab) {
    setEditingEvent(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function closeInputModal() {
    setEditingEvent(null);
    setIsInputModalOpen(false);
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
        {activeTab === "pattern" ? (
          <section className="screen-stack">
            <Suspense fallback={<p className="empty-copy">패턴을 불러오는 중입니다.</p>}>
              <PatternCards
                events={events}
                selectedDate={analysisDate}
                summary={buildDailySummary(events, analysisDate)}
                onDateChange={setAnalysisDate}
              />
            </Suspense>
          </section>
        ) : null}
        {activeTab === "growth" ? (
          <section className="screen-stack">
            <Suspense fallback={<p className="empty-copy">성장 기록을 불러오는 중입니다.</p>}>
              <GrowthScreen baby={baby} user={user} />
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
      {pushPermissionPromptMode ? (
        <div className="modal-backdrop push-permission-backdrop" role="presentation">
          <section
            aria-label="수유 알림 설정"
            aria-modal="true"
            className="modal-panel push-permission-panel"
            role="dialog"
          >
            {pushPermissionPromptMode === "permission" ? (
              <>
                <p className="push-permission-kicker">수유 리마인드</p>
                <h2>아기가 배고파할 때 알려드릴까요?</h2>
                <p>
                  마지막 수유 후 설정한 기준 시간보다 10분이 지나면
                  푸시 알림으로 알려드릴게요.
                </p>
                <div className="push-permission-actions">
                  <button
                    className="primary-button"
                    disabled={isPushPermissionBusy}
                    type="button"
                    onClick={() => void handleAllowPushPermission()}
                  >
                    {isPushPermissionBusy ? "설정 중..." : "알림 받기"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={isPushPermissionBusy}
                    type="button"
                    onClick={dismissPushPermissionPrompt}
                  >
                    나중에
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="push-permission-kicker">알림 꺼짐</p>
                <h2>iOS 설정에서 알림을 켜주세요</h2>
                <p>
                  알림 권한이 꺼져 있어 수유 리마인드를 보낼 수 없어요.
                  iOS 설정의 앙팡타임 알림에서 권한을 허용해 주세요.
                </p>
                <div className="push-permission-actions">
                  <button className="primary-button" type="button" onClick={dismissPushPermissionPrompt}>
                    확인했어요
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
      {isInputModalOpen ? (
        <div className="input-modal-backdrop" role="presentation" onMouseDown={closeInputModal}>
          <section
            aria-label={editingEvent ? "기록 수정" : "빠른 기록"}
            aria-modal="true"
            className="input-modal-panel"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="input-modal-header">
              <strong>{editingEvent ? "기록 수정" : "바로 남기기"}</strong>
              <button type="button" onClick={closeInputModal}>닫기</button>
            </div>
            <EventInputScreen
              baby={baby}
              editingEvent={editingEvent}
              events={events}
              hideAds
              initialEventType={inputEventType}
              onSubmit={handleAddEvent}
              onUpdateEvent={handleUpdateEventFromInput}
            />
          </section>
        </div>
      ) : null}
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
