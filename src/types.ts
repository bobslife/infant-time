export type EventType = "feed" | "sleep" | "pee" | "poop";

export type PoopAmount = "small" | "normal" | "large";

export type PoopColor = "ocher" | "brown" | "dark_brown" | "green" | "red_orange";

export interface BabyProfile {
  id: string;
  ownerId: string;
  name: string;
  birthDate: string;
  createdAt: string;
}

export interface BabyEvent {
  id: string;
  userId: string;
  babyId: string;
  eventType: EventType;
  occurredAt: string;
  endedAt?: string | null;
  amountMl?: number | null;
  poopAmount?: PoopAmount | null;
  poopColor?: PoopColor | null;
  createdAt: string;
  note?: string;
}

export interface CreateBabyInput {
  name: string;
  birthDate: string;
}

export interface CreateEventInput {
  babyId: string;
  eventType: EventType;
  occurredAt: string;
  endedAt?: string | null;
  amountMl?: number | null;
  poopAmount?: PoopAmount | null;
  poopColor?: PoopColor | null;
  note?: string;
}

export interface UpdateEventInput extends CreateEventInput {
  id: string;
}

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  isLocal: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}
