import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  createLocalBaby,
  createLocalEvent,
  deleteLocalEvent,
  deleteLocalAccount,
  getSelectedLocalBabyId,
  joinLocalBaby,
  listLocalBabies,
  listLocalEvents,
  localUser,
  setSelectedLocalBabyId,
  updateLocalBaby,
  updateLocalEvent,
} from "../../lib/storage/localRepository";
import {
  createSupabaseBaby,
  createSupabaseEvent,
  deleteSupabaseEvent,
  deleteSupabaseAccount,
  ensureProfile,
  joinSupabaseBaby,
  listSupabaseBabies,
  listSupabaseEvents,
  mapSupabaseUser,
  updateSupabaseBaby,
  updateSupabaseEvent,
} from "../../lib/storage/supabaseRepository";
import { startOfToday } from "../../lib/time";
import {
  AppUser,
  BabyEvent,
  BabyProfile,
  CreateBabyInput,
  CreateEventInput,
  JoinBabyInput,
  PoopAmount,
  PoopColor,
  SignInInput,
  SignUpInput,
  UpdateEventInput,
  UpdateBabyInput,
} from "../../types";

export interface EventSummary {
  lastFeedAt: string | null;
  lastFeedAmountMl: number | null;
  lastPoopAt: string | null;
  lastPoopAmount: PoopAmount | null;
  lastPoopColor: PoopColor | null;
  todayFeedCount: number;
  todayFeedTotalMl: number;
  todaySleepCount: number;
  todaySleepMinutes: number;
  todayPeeCount: number;
  todayPoopCount: number;
  todayDiaperCount: number;
  todayMedicineCount: number;
  todayTemperatureCount: number;
  todayMealCount: number;
  latestTemperatureC: number | null;
  activeSleepStartedAt: string | null;
  latestFeedGapMinutes: number | null;
}

export interface DailyEventSummary {
  feedCount: number;
  feedTotalMl: number;
  sleepCount: number;
  sleepMinutes: number;
  peeCount: number;
  poopCount: number;
  diaperCount: number;
  medicineCount: number;
  temperatureCount: number;
  mealCount: number;
}

function sortDescending(events: BabyEvent[]) {
  return [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

function getSleepDurationMinutes(event: BabyEvent, now = new Date()): number {
  if (event.eventType !== "sleep") {
    return 0;
  }

  const start = new Date(event.occurredAt).getTime();
  const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();

  return Math.max(0, Math.round((end - start) / 60000));
}

export function buildDailySummary(events: BabyEvent[], date: string): DailyEventSummary {
  const targetStart = new Date(`${date}T00:00:00`);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetEnd.getDate() + 1);

  const dayEvents = events.filter((event) => {
    const occurred = new Date(event.occurredAt).getTime();
    return occurred >= targetStart.getTime() && occurred < targetEnd.getTime();
  });

  const feedEvents = dayEvents.filter((event) => event.eventType === "feed");
  const sleepEvents = dayEvents.filter((event) => event.eventType === "sleep");

  return {
    feedCount: feedEvents.length,
    feedTotalMl: feedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0),
    sleepCount: sleepEvents.length,
    sleepMinutes: sleepEvents.reduce((total, event) => total + getSleepDurationMinutes(event), 0),
    peeCount: dayEvents.filter((event) => event.eventType === "pee").length,
    poopCount: dayEvents.filter((event) => event.eventType === "poop").length,
    diaperCount: dayEvents.filter((event) => ["diaper", "pee", "poop"].includes(event.eventType)).length,
    medicineCount: dayEvents.filter((event) => event.eventType === "medicine").length,
    temperatureCount: dayEvents.filter((event) => event.eventType === "temperature").length,
    mealCount: dayEvents.filter((event) => event.eventType === "meal").length,
  };
}

function buildSummary(events: BabyEvent[]): EventSummary {
  const today = startOfToday();
  const todayEvents = events.filter(
    (event) => new Date(event.occurredAt).getTime() >= today.getTime(),
  );

  const feedEvents = events.filter((event) => event.eventType === "feed");
  const todayFeedEvents = todayEvents.filter((event) => event.eventType === "feed");
  const poopEvents = events.filter((event) => event.eventType === "poop");
  const sleepEvents = todayEvents.filter((event) => event.eventType === "sleep");
  const activeSleep = events.find((event) => event.eventType === "sleep" && !event.endedAt) ?? null;
  const temperatureEvents = events.filter((event) => event.eventType === "temperature");

  const lastFeedAt = feedEvents[0]?.occurredAt ?? null;
  const lastPoopAt = poopEvents[0]?.occurredAt ?? null;

  let latestFeedGapMinutes: number | null = null;
  if (feedEvents.length >= 2) {
    const latest = new Date(feedEvents[0].occurredAt).getTime();
    const previous = new Date(feedEvents[1].occurredAt).getTime();
    latestFeedGapMinutes = Math.round((latest - previous) / 60000);
  }

  const todaySleepMinutes = sleepEvents.reduce(
    (total, event) => total + getSleepDurationMinutes(event),
    0,
  );

  return {
    lastFeedAt,
    lastFeedAmountMl: feedEvents[0]?.amountMl ?? null,
    lastPoopAt,
    lastPoopAmount: poopEvents[0]?.poopAmount ?? null,
    lastPoopColor: poopEvents[0]?.poopColor ?? null,
    todayFeedCount: todayFeedEvents.length,
    todayFeedTotalMl: todayFeedEvents.reduce((total, event) => total + (event.amountMl ?? 0), 0),
    todaySleepCount: sleepEvents.length,
    todaySleepMinutes,
    todayPeeCount: todayEvents.filter((event) => event.eventType === "pee").length,
    todayPoopCount: todayEvents.filter((event) => event.eventType === "poop").length,
    todayDiaperCount: todayEvents.filter((event) => ["diaper", "pee", "poop"].includes(event.eventType)).length,
    todayMedicineCount: todayEvents.filter((event) => event.eventType === "medicine").length,
    todayTemperatureCount: todayEvents.filter((event) => event.eventType === "temperature").length,
    todayMealCount: todayEvents.filter((event) => event.eventType === "meal").length,
    latestTemperatureC: temperatureEvents[0]?.temperatureC ?? null,
    activeSleepStartedAt: activeSleep?.occurredAt ?? null,
    latestFeedGapMinutes,
  };
}

export function useEvents() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<AppUser | null>(client ? null : localUser);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedBabyStorageKey = useCallback(
    (userId: string) => `infant-time-selected-baby-${userId}`,
    [],
  );

  const normalizeOvernightSleep = useCallback(
    async (nextUser: AppUser, nextBaby: BabyProfile, nextEvents: BabyEvent[]) => {
      const activeSleep = nextEvents.find((event) => event.eventType === "sleep" && !event.endedAt) ?? null;

      if (!activeSleep) {
        return nextEvents;
      }

      const todayStart = startOfToday();
      const activeSleepStartedAt = new Date(activeSleep.occurredAt).getTime();

      if (activeSleepStartedAt >= todayStart.getTime()) {
        return nextEvents;
      }

      const midnightIso = todayStart.toISOString();
      const createInput: CreateEventInput = {
        babyId: nextBaby.id,
        eventType: "sleep",
        occurredAt: midnightIso,
        note: activeSleep.note,
      };
      const updateInput: UpdateEventInput = {
        id: activeSleep.id,
        babyId: activeSleep.babyId,
        eventType: activeSleep.eventType,
        occurredAt: activeSleep.occurredAt,
        endedAt: midnightIso,
        amountMl: activeSleep.amountMl,
        diaperType: activeSleep.diaperType,
        poopAmount: activeSleep.poopAmount,
        poopColor: activeSleep.poopColor,
        medicineName: activeSleep.medicineName,
        medicineDose: activeSleep.medicineDose,
        medicineNextAt: activeSleep.medicineNextAt,
        temperatureC: activeSleep.temperatureC,
        temperatureLocation: activeSleep.temperatureLocation,
        mealName: activeSleep.mealName,
        mealAmountG: activeSleep.mealAmountG,
        mealReaction: activeSleep.mealReaction,
        note: activeSleep.note,
      };

      const createdSleep =
        client && !nextUser.isLocal
          ? await createSupabaseEvent(client, nextUser.id, createInput)
          : await createLocalEvent(createInput);

      try {
        const closedSleep =
          client && !nextUser.isLocal
            ? await updateSupabaseEvent(client, updateInput)
            : await updateLocalEvent(updateInput);

        return sortDescending([
          createdSleep,
          ...nextEvents.map((event) => (event.id === closedSleep.id ? closedSleep : event)),
        ]);
      } catch (error) {
        try {
          if (client && !nextUser.isLocal) {
            await deleteSupabaseEvent(client, createdSleep.id);
          } else {
            await deleteLocalEvent(createdSleep.id);
          }
        } catch {
          // Best effort rollback if the second write fails.
        }

        throw error;
      }
    },
    [client],
  );

  const loadEventsForBaby = useCallback(
    async (nextUser: AppUser, nextBaby: BabyProfile) => {
      const nextEvents =
        client && !nextUser.isLocal
          ? await listSupabaseEvents(client, nextBaby.id)
          : await listLocalEvents(nextBaby.id);

      let normalizedEvents = nextEvents;
      try {
        normalizedEvents = await normalizeOvernightSleep(nextUser, nextBaby, nextEvents);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "자정 경계의 수면 기록을 자동으로 보정하지 못했습니다.",
        );
      }

      setBaby(nextBaby);
      setEvents(normalizedEvents);
    },
    [client, normalizeOvernightSleep],
  );

  const loadForUser = useCallback(
    async (nextUser: AppUser) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (client && !nextUser.isLocal) {
          await ensureProfile(client, nextUser);
          const nextBabies = await listSupabaseBabies(client, nextUser.id);
          const savedBabyId = window.localStorage.getItem(selectedBabyStorageKey(nextUser.id));
          const nextBaby =
            nextBabies.find((item) => item.id === savedBabyId) ?? nextBabies[0] ?? null;

          setBabies(nextBabies);
          if (nextBaby) {
            await loadEventsForBaby(nextUser, nextBaby);
          } else {
            setBaby(null);
            setEvents([]);
          }
          return;
        }

        const nextBabies = await listLocalBabies();
        const savedBabyId = await getSelectedLocalBabyId();
        const nextBaby = nextBabies.find((item) => item.id === savedBabyId) ?? nextBabies[0] ?? null;

        setBabies(nextBabies);
        if (nextBaby) {
          await loadEventsForBaby(nextUser, nextBaby);
        } else {
          setBaby(null);
          setEvents([]);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [client, loadEventsForBaby, selectedBabyStorageKey],
  );

  useEffect(() => {
    if (!client) {
      void loadForUser(localUser);
      return;
    }

    let mounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      const sessionUser = data.session?.user;
      if (!sessionUser) {
        setIsLoading(false);
        return;
      }

      const nextUser = mapSupabaseUser(sessionUser);
      setUser(nextUser);
      void loadForUser(nextUser);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;

      if (!sessionUser) {
        setUser(null);
        setBabies([]);
        setBaby(null);
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const nextUser = mapSupabaseUser(sessionUser);
      setUser(nextUser);
      void loadForUser(nextUser);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [client, loadForUser]);

  const summary = useMemo(() => buildSummary(events), [events]);

  async function signUp(input: SignUpInput) {
    if (!client) {
      setUser(localUser);
      await loadForUser(localUser);
      return;
    }

    setErrorMessage(null);

    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (signInError || !signInData.user) {
        setErrorMessage(
          "회원가입은 완료됐지만 이메일 확인이 필요합니다. Supabase Email Provider에서 Confirm email을 비활성화해 주세요.",
        );
        return;
      }

      const nextUser = mapSupabaseUser(signInData.user);
      setUser(nextUser);
      await loadForUser(nextUser);
      return;
    }

    const sessionUser = data.session.user;

    if (sessionUser) {
      const nextUser = mapSupabaseUser(sessionUser);
      setUser(nextUser);
      await loadForUser(nextUser);
    }
  }

  async function signIn(input: SignInInput) {
    if (!client) {
      setUser(localUser);
      await loadForUser(localUser);
      return;
    }

    setErrorMessage(null);

    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.user) {
      const nextUser = mapSupabaseUser(data.user);
      setUser(nextUser);
      await loadForUser(nextUser);
    }
  }

  async function useLocalPreview() {
    setUser(localUser);
    await loadForUser(localUser);
  }

  async function signOut() {
    if (client && user && !user.isLocal) {
      await client.auth.signOut();
    }

    setUser(client ? null : localUser);
    setBabies([]);
    setBaby(null);
    setEvents([]);

    if (!client) {
      await loadForUser(localUser);
    }
  }

  async function deleteAccount() {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      if (client && !user.isLocal) {
        await deleteSupabaseAccount(client);
        await client.auth.signOut().catch(() => undefined);
        window.localStorage.removeItem(selectedBabyStorageKey(user.id));
        setUser(null);
      } else {
        await deleteLocalAccount();
        setUser(client ? null : localUser);
      }

      setBabies([]);
      setBaby(null);
      setEvents([]);

      if (!client) {
        await loadForUser(localUser);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원 탈퇴를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  async function createBaby(input: CreateBabyInput) {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      const created =
        client && !user.isLocal
          ? await createSupabaseBaby(client, user.id, input)
          : await createLocalBaby(input);

      setBabies((current) => [...current, created]);
      setBaby(created);
      setEvents([]);
      if (client && !user.isLocal) {
        window.localStorage.setItem(selectedBabyStorageKey(user.id), created.id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "아기 정보를 저장하지 못했습니다.");
    }
  }

  async function updateBaby(input: UpdateBabyInput) {
    if (!user || !baby) {
      return;
    }

    setErrorMessage(null);

    try {
      const updated =
        client && !user.isLocal
          ? await updateSupabaseBaby(client, input)
          : await updateLocalBaby(input);

      setBabies((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setBaby(updated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "아기 정보를 수정하지 못했습니다.");
    }
  }

  async function joinBaby(input: JoinBabyInput) {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      const joined =
        client && !user.isLocal
          ? await joinSupabaseBaby(client, user.id, input)
          : await joinLocalBaby(input);

      setBabies((current) => {
        if (current.some((item) => item.id === joined.id)) {
          return current;
        }

        return [...current, joined];
      });
      if (client && !user.isLocal) {
        window.localStorage.setItem(selectedBabyStorageKey(user.id), joined.id);
      }
      await loadEventsForBaby(user, joined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "아기 코드를 등록하지 못했습니다.");
    }
  }

  async function selectBaby(babyId: string) {
    if (!user) {
      return;
    }

    const selected = babies.find((item) => item.id === babyId);
    if (!selected) {
      return;
    }

    setErrorMessage(null);

    try {
      if (client && !user.isLocal) {
        window.localStorage.setItem(selectedBabyStorageKey(user.id), selected.id);
      } else {
        await setSelectedLocalBabyId(selected.id);
      }

      await loadEventsForBaby(user, selected);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "아기 데이터를 불러오지 못했습니다.");
    }
  }

  async function addEvent(input: CreateEventInput) {
    if (!user || !baby) {
      return;
    }

    setErrorMessage(null);

    try {
      const created =
        client && !user.isLocal
          ? await createSupabaseEvent(client, user.id, input)
          : await createLocalEvent(input);

      setEvents((current) => sortDescending([created, ...current]));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "기록을 저장하지 못했습니다.");
    }
  }

  async function updateEvent(input: UpdateEventInput) {
    if (!user || !baby) {
      return;
    }

    setErrorMessage(null);

    try {
      const updated =
        client && !user.isLocal
          ? await updateSupabaseEvent(client, input)
          : await updateLocalEvent(input);

      setEvents((current) =>
        sortDescending(current.map((event) => (event.id === updated.id ? updated : event))),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "기록을 수정하지 못했습니다.");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      if (client && !user.isLocal) {
        await deleteSupabaseEvent(client, eventId);
      } else {
        await deleteLocalEvent(eventId);
      }

      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "기록을 삭제하지 못했습니다.");
    }
  }

  return {
    user,
    babies,
    baby,
    events,
    isLoading,
    errorMessage,
    summary,
    hasSupabase: Boolean(client),
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
  };
}
