import type { BabyEvent, MealStage } from "../../types";

export const mealStages: Array<{ value: MealStage; label: string }> = [
  { value: "early", label: "초기" },
  { value: "middle", label: "중기" },
  { value: "late", label: "후기" },
];

// These are display presets, not age limits or food-introduction rules.
export const mealToppings = [
  { id: "rice", label: "쌀", stage: "early" },
  { id: "oat", label: "오트밀", stage: "early" },
  { id: "zucchini", label: "애호박", stage: "early" },
  { id: "beef", label: "소고기", stage: "early" },
  { id: "potato", label: "감자", stage: "early" },
  { id: "pumpkin", label: "단호박", stage: "early" },
  { id: "carrot", label: "당근", stage: "early" },
  { id: "broccoli", label: "브로콜리", stage: "early" },
  { id: "chicken", label: "닭고기", stage: "middle" },
  { id: "tofu", label: "두부", stage: "middle" },
  { id: "spinach", label: "시금치", stage: "middle" },
  { id: "cabbage", label: "양배추", stage: "middle" },
  { id: "egg", label: "달걀", stage: "late" },
  { id: "fish", label: "생선", stage: "late" },
  { id: "mushroom", label: "버섯", stage: "late" },
  { id: "onion", label: "양파", stage: "late" },
] as const;

export function isMealStage(value: unknown): value is MealStage {
  return mealStages.some((stage) => stage.value === value);
}

export function getStageToppings(stage: MealStage) {
  const index = mealStages.findIndex((item) => item.value === stage);
  return mealToppings.filter((item) => mealStages.findIndex((entry) => entry.value === item.stage) <= index);
}

export function getTopping(id: string) {
  return mealToppings.find((item) => item.id === id);
}

const CUSTOM_TOPPING_PREFIX = "custom:";
export const MAX_TOPPING_NAME_LENGTH = 30;
export const MAX_TOPPINGS = 32;

export function getToppingLabel(id: string): string {
  return id.startsWith(CUSTOM_TOPPING_PREFIX)
    ? id.slice(CUSTOM_TOPPING_PREFIX.length)
    : getTopping(id)?.label ?? id;
}

export function createCustomToppingId(name: string): string {
  const normalized = name.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > MAX_TOPPING_NAME_LENGTH) {
    throw new Error(`재료 이름을 1~${MAX_TOPPING_NAME_LENGTH}자로 입력해 주세요`);
  }
  const existing = mealToppings.find((item) => item.label === normalized);
  return existing?.id ?? `${CUSTOM_TOPPING_PREFIX}${normalized}`;
}

export function getMealCombination(ids: readonly string[]) {
  return ids.map(getToppingLabel).join(" · ");
}

const stageKey = (babyId: string) => `infant-time-meal-stage-${babyId}`;
export function getRememberedMealStage(babyId: string, events: BabyEvent[]): MealStage {
  const latest = events
    .filter((event) => event.babyId === babyId && isMealStage(event.mealStage))
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )[0];

  if (latest?.mealStage) {
    return latest.mealStage;
  }

  try {
    const saved = window.localStorage.getItem(stageKey(babyId));
    if (isMealStage(saved)) return saved;
  } catch { /* Storage can be unavailable in private browsing or SSR. */ }
  return "early";
}

export function rememberMealStage(babyId: string, stage: MealStage) {
  try { window.localStorage.setItem(stageKey(babyId), stage); } catch { /* Saving a record remains available. */ }
}
