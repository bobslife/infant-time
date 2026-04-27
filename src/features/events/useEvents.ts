import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  createLocalBaby,
  createLocalEvent,
  deleteLocalEvent,
  getSelectedLocalBabyId,
  joinLocalBaby,
  listLocalBabies,
  listLocalEvents,
  localUser,
  setSelectedLocalBabyId,
  updateLocalEvent,
} from "../../lib/storage/localRepository";
import {
  createSupabaseBaby,
  createSupabaseEvent,
  deleteSupabaseEvent,
  ensureProfile,
  joinSupabaseBaby,
  listSupabaseBabies,
  listSupabaseEvents,
  mapSupabaseUser,
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
  latestFeedGapMinutes: number | null;
}

export interface DailyEventSummary {
  feedCount: number;
  feedTotalMl: number;
  sleepCount: number;
  sleepMinutes: number;
  peeCount: number;
  poopCount: number;
}

function sortDescending(events: BabyEvent[]) {
  return [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
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
    sleepMinutes: sleepEvents.reduce((total, event) => {
      if (!event.endedAt) {
        return total;
      }

      const start = new Date(event.occurredAt).getTime();
      const end = new Date(event.endedAt).getTime();
      return total + Math.max(0, Math.round((end - start) / 60000));
    }, 0),
    peeCount: dayEvents.filter((event) => event.eventType === "pee").length,
    poopCount: dayEvents.filter((event) => event.eventType === "poop").length,
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

  const lastFeedAt = feedEvents[0]?.occurredAt ?? null;
  const lastPoopAt = poopEvents[0]?.occurredAt ?? null;

  let latestFeedGapMinutes: number | null = null;
  if (feedEvents.length >= 2) {
    const latest = new Date(feedEvents[0].occurredAt).getTime();
    const previous = new Date(feedEvents[1].occurredAt).getTime();
    latestFeedGapMinutes = Math.round((latest - previous) / 60000);
  }

  const todaySleepMinutes = sleepEvents.reduce((total, event) => {
    if (!event.endedAt) {
      return total;
    }

    const start = new Date(event.occurredAt).getTime();
    const end = new Date(event.endedAt).getTime();
    return total + Math.max(0, Math.round((end - start) / 60000));
  }, 0);

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

  const loadEventsForBaby = useCallback(
    async (nextUser: AppUser, nextBaby: BabyProfile) => {
      const nextEvents =
        client && !nextUser.isLocal
          ? await listSupabaseEvents(client, nextBaby.id)
          : await listLocalEvents(nextBaby.id);

      setBaby(nextBaby);
      setEvents(nextEvents);
    },
    [client],
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
    createBaby,
    joinBaby,
    selectBaby,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}
