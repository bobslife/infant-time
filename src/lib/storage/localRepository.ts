import {
  AppUser,
  BabyEvent,
  BabyProfile,
  CreateBabyInput,
  CreateEventInput,
  JoinBabyInput,
  UpdateEventInput,
} from "../../types";
import { mockEvents } from "./mockEvents";

const EVENTS_STORAGE_KEY = "infant-time-events";
const BABIES_STORAGE_KEY = "infant-time-babies";
const SELECTED_BABY_STORAGE_KEY = "infant-time-selected-baby";
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

function readBabies(): BabyProfile[] {
  const saved = window.localStorage.getItem(BABIES_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  return JSON.parse(saved) as BabyProfile[];
}

function writeBabies(babies: BabyProfile[]) {
  window.localStorage.setItem(BABIES_STORAGE_KEY, JSON.stringify(babies));
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existingCodes = new Set(readBabies().map((baby) => baby.inviteCode));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Array.from({ length: 8 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");

    if (!existingCodes.has(code)) {
      return code;
    }
  }

  return crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

export async function listLocalBabies(): Promise<BabyProfile[]> {
  return readBabies();
}

export async function getSelectedLocalBabyId(): Promise<string | null> {
  return window.localStorage.getItem(SELECTED_BABY_STORAGE_KEY);
}

export async function setSelectedLocalBabyId(babyId: string): Promise<void> {
  window.localStorage.setItem(SELECTED_BABY_STORAGE_KEY, babyId);
}

export async function createLocalBaby(input: CreateBabyInput): Promise<BabyProfile> {
  const baby: BabyProfile = {
    id: crypto.randomUUID(),
    ownerId: LOCAL_USER_ID,
    name: input.name,
    birthDate: input.birthDate,
    inviteCode: generateInviteCode(),
    createdAt: new Date().toISOString(),
  };

  writeBabies([...readBabies(), baby]);
  await setSelectedLocalBabyId(baby.id);
  return baby;
}

export async function joinLocalBaby(input: JoinBabyInput): Promise<BabyProfile> {
  const inviteCode = input.inviteCode.trim().toUpperCase();
  const baby = readBabies().find((item) => item.inviteCode === inviteCode);

  if (!baby) {
    throw new Error("해당 아기 코드를 찾지 못했습니다.");
  }

  await setSelectedLocalBabyId(baby.id);
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
