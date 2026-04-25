import { BabyEvent } from "../../types";

const now = Date.now();
const babyId = "local-baby";
const userId = "local-user";

export const mockEvents: BabyEvent[] = [
  {
    id: "feed-1",
    userId,
    babyId,
    eventType: "feed",
    occurredAt: new Date(now - 5.5 * 60 * 60 * 1000).toISOString(),
    amountMl: 90,
    createdAt: new Date(now - 5.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "poop-1",
    userId,
    babyId,
    eventType: "poop",
    occurredAt: new Date(now - 3.25 * 60 * 60 * 1000).toISOString(),
    poopAmount: "normal",
    poopColor: "brown",
    createdAt: new Date(now - 3.25 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "feed-2",
    userId,
    babyId,
    eventType: "feed",
    occurredAt: new Date(now - 75 * 60 * 1000).toISOString(),
    amountMl: 100,
    createdAt: new Date(now - 75 * 60 * 1000).toISOString(),
  },
  {
    id: "pee-1",
    userId,
    babyId,
    eventType: "pee",
    occurredAt: new Date(now - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "sleep-1",
    userId,
    babyId,
    eventType: "sleep",
    occurredAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    endedAt: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
  },
];
