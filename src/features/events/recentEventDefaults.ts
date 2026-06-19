import type {
  BabyEvent,
  DiaperType,
  MealReaction,
  PoopAmount,
  PoopColor,
  TemperatureLocation,
} from "../../types";

export interface RecentEventDefaults {
  bottleAmountMl: number;
  hasBottleAmount: boolean;
  diaperType: DiaperType;
  poopAmount: PoopAmount;
  poopColor: PoopColor;
  hasDiaper: boolean;
  medicineName: string;
  medicineDose: string;
  hasMedicine: boolean;
  temperatureLocation: TemperatureLocation;
  hasTemperatureLocation: boolean;
  mealName: string;
  mealAmountG: number | "";
  mealReaction: MealReaction;
  hasMeal: boolean;
}

function newestFirst(events: BabyEvent[]) {
  return [...events].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

export function getRecentEventDefaults(events: BabyEvent[]): RecentEventDefaults {
  const sorted = newestFirst(events);
  const bottle = sorted.find(
    (event) =>
      event.eventType === "feed" &&
      (event.feedingMethod ?? "bottle") === "bottle" &&
      event.amountMl !== null &&
      event.amountMl !== undefined,
  );
  const diaper = sorted.find((event) =>
    event.eventType === "diaper" || event.eventType === "pee" || event.eventType === "poop"
  );
  const medicine = sorted.find((event) => event.eventType === "medicine");
  const temperature = sorted.find((event) => event.eventType === "temperature");
  const meal = sorted.find((event) => event.eventType === "meal");

  const diaperType: DiaperType =
    diaper?.eventType === "pee"
      ? "wet"
      : diaper?.eventType === "poop"
        ? "dirty"
        : diaper?.diaperType ?? "wet";

  return {
    bottleAmountMl: bottle?.amountMl ?? 120,
    hasBottleAmount: Boolean(bottle),
    diaperType,
    poopAmount: diaper?.poopAmount ?? "normal",
    poopColor: diaper?.poopColor ?? "ocher",
    hasDiaper: Boolean(diaper),
    medicineName: medicine?.medicineName?.trim() ?? "",
    medicineDose: medicine?.medicineDose?.trim() ?? "",
    hasMedicine: Boolean(medicine?.medicineName?.trim() || medicine?.medicineDose?.trim()),
    temperatureLocation: temperature?.temperatureLocation ?? "forehead",
    hasTemperatureLocation: Boolean(temperature?.temperatureLocation),
    mealName: meal?.mealName?.trim() ?? "",
    mealAmountG: meal?.mealAmountG ?? "",
    mealReaction: meal?.mealReaction ?? "good",
    hasMeal: Boolean(meal),
  };
}
