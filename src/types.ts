export type EventType =
  | "feed"
  | "sleep"
  | "diaper"
  | "medicine"
  | "temperature"
  | "meal"
  | "memo"
  | "pee"
  | "poop"
  | "bath"
  | "play";

export type DiaperType = "wet" | "dirty" | "both";

export type PoopAmount = "small" | "normal" | "large";

export type PoopColor = "ocher" | "brown" | "dark_brown" | "green" | "red_orange";

export type TemperatureLocation = "forehead" | "ear" | "armpit";

export type MealReaction = "good" | "normal" | "poor" | "allergy";

export type FeedingMethod = "bottle" | "breast";

export type BabyGender = "girl" | "boy";

export interface BabyProfile {
  id: string;
  ownerId: string;
  name: string;
  birthDate: string;
  gender: BabyGender;
  inviteCode: string;
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
  feedingMethod?: FeedingMethod | null;
  breastLeftMinutes?: number | null;
  breastRightMinutes?: number | null;
  diaperType?: DiaperType | null;
  poopAmount?: PoopAmount | null;
  poopColor?: PoopColor | null;
  medicineName?: string | null;
  medicineDose?: string | null;
  medicineNextAt?: string | null;
  temperatureC?: number | null;
  temperatureLocation?: TemperatureLocation | null;
  mealName?: string | null;
  mealAmountG?: number | null;
  mealReaction?: MealReaction | null;
  createdAt: string;
  note?: string;
}

export interface GrowthRecord {
  id: string;
  babyId: string;
  measuredAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  headCm?: number | null;
  note?: string | null;
  createdAt: string;
}

export interface CreateGrowthRecordInput {
  babyId: string;
  measuredAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  headCm?: number | null;
  note?: string | null;
}

export interface CreateBabyInput {
  name: string;
  birthDate: string;
  gender?: BabyGender;
}

export interface JoinBabyInput {
  inviteCode: string;
}

export interface UpdateBabyInput {
  id: string;
  name: string;
  birthDate: string;
  gender: BabyGender;
}

export interface CreateEventInput {
  babyId: string;
  eventType: EventType;
  occurredAt: string;
  endedAt?: string | null;
  amountMl?: number | null;
  feedingMethod?: FeedingMethod | null;
  breastLeftMinutes?: number | null;
  breastRightMinutes?: number | null;
  diaperType?: DiaperType | null;
  poopAmount?: PoopAmount | null;
  poopColor?: PoopColor | null;
  medicineName?: string | null;
  medicineDose?: string | null;
  medicineNextAt?: string | null;
  temperatureC?: number | null;
  temperatureLocation?: TemperatureLocation | null;
  mealName?: string | null;
  mealAmountG?: number | null;
  mealReaction?: MealReaction | null;
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
