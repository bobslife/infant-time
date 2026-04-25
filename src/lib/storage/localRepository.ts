import {
  AppUser,
  BabyEvent,
  BabyProfile,
  CreateBabyInput,
  CreateEventInput,
  UpdateEventInput,
} from "../../types";
import { mockEvents } from "./mockEvents";

const EVENTS_STORAGE_KEY = "infant-time-events";
const BABY_STORAGE_KEY = "infant-time-baby";
const LOCAL_USER_ID = "local-user";

export const localUser: AppUser = {
  id: LOCAL_USER_ID,
  name: "로컬 사용자",
  email: "local-preview@infant-time.local",
  isLocal: true,
};

function sortDescending(events: BabyEvent[]): BabyEvent[] {
  return [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

function defaultBaby(): BabyProfile {
  return {
    id: "local-baby",
    ownerId: LOCAL_USER_ID,
    name: "아기",
    birthDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
}

function readEvents(): BabyEvent[] {
  const saved = window.localStorage.getItem(EVENTS_STORAGE_KEY);

  if (!saved) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(mockEvents));
    return sortDescending(mockEvents);
  }

  const parsed = JSON.parse(saved) as BabyEvent[];
  return sortDescending(parsed);
}

function writeEvents(events: BabyEvent[]) {
  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(sortDescending(events)));
}

export async function getLocalBaby(): Promise<BabyProfile | null> {
  const saved = window.localStorage.getItem(BABY_STORAGE_KEY);

  if (!saved) {
    const baby = defaultBaby();
    window.localStorage.setItem(BABY_STORAGE_KEY, JSON.stringify(baby));
    return baby;
  }

  return JSON.parse(saved) as BabyProfile;
}

export async function createLocalBaby(input: CreateBabyInput): Promise<BabyProfile> {
  const baby: BabyProfile = {
    id: crypto.randomUUID(),
    ownerId: LOCAL_USER_ID,
    name: input.name,
    birthDate: input.birthDate,
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(BABY_STORAGE_KEY, JSON.stringify(baby));
  writeEvents([]);
  return baby;
}

export async function listLocalEvents(babyId: string): Promise<BabyEvent[]> {
  return readEvents().filter((event) => event.babyId === babyId);
}

export async function createLocalEvent(input: CreateEventInput): Promise<BabyEvent> {
  const nextEvent: BabyEvent = {
    id: crypto.randomUUID(),
    userId: LOCAL_USER_ID,
    babyId: input.babyId,
    eventType: input.eventType,
    occurredAt: new Date(input.occurredAt).toISOString(),
    endedAt: input.endedAt ? new Date(input.endedAt).toISOString() : null,
    amountMl: input.amountMl ?? null,
    poopAmount: input.poopAmount ?? null,
    poopColor: input.poopColor ?? null,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  const events = readEvents();
  writeEvents([nextEvent, ...events]);
  return nextEvent;
}

export async function updateLocalEvent(input: UpdateEventInput): Promise<BabyEvent> {
  const events = readEvents();
  const current = events.find((event) => event.id === input.id);

  if (!current) {
    throw new Error("수정할 기록을 찾지 못했습니다.");
  }

  const updated: BabyEvent = {
    ...current,
    babyId: input.babyId,
    eventType: input.eventType,
    occurredAt: new Date(input.occurredAt).toISOString(),
    endedAt: input.endedAt ? new Date(input.endedAt).toISOString() : null,
    amountMl: input.amountMl ?? null,
    poopAmount: input.poopAmount ?? null,
    poopColor: input.poopColor ?? null,
    note: input.note,
  };

  writeEvents(events.map((event) => (event.id === input.id ? updated : event)));
  return updated;
}

export async function deleteLocalEvent(eventId: string): Promise<void> {
  writeEvents(readEvents().filter((event) => event.id !== eventId));
}
