import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AppUser,
  BabyEvent,
  BabyProfile,
  CreateBabyInput,
  CreateEventInput,
  UpdateEventInput,
} from "../../types";

interface BabyRow {
  id: string;
  owner_id: string;
  name: string;
  birth_date: string;
  created_at: string;
}

interface EventRow {
  id: string;
  user_id: string;
  baby_id: string;
  event_type: BabyEvent["eventType"];
  occurred_at: string;
  ended_at: string | null;
  amount_ml: number | null;
  poop_amount: BabyEvent["poopAmount"];
  poop_color: BabyEvent["poopColor"];
  note: string | null;
  created_at: string;
}

export function mapSupabaseUser(user: User): AppUser {
  const metadataName =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null;

  return {
    id: user.id,
    name: metadataName,
    email: user.email ?? null,
    isLocal: false,
  };
}

function mapBaby(row: BabyRow): BabyProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    birthDate: row.birth_date,
    createdAt: row.created_at,
  };
}

function mapEvent(row: EventRow): BabyEvent {
  return {
    id: row.id,
    userId: row.user_id,
    babyId: row.baby_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    endedAt: row.ended_at,
    amountMl: row.amount_ml,
    poopAmount: row.poop_amount,
    poopColor: row.poop_color,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function ensureProfile(client: SupabaseClient, user: AppUser) {
  const { error } = await client.from("profiles").upsert({
    id: user.id,
    name: user.name ?? user.email?.split("@")[0] ?? "",
    email: user.email,
  });

  if (error) {
    throw error;
  }
}

export async function getSupabaseBaby(
  client: SupabaseClient,
  userId: string,
): Promise<BabyProfile | null> {
  const { data, error } = await client
    .from("babies")
    .select("id, owner_id, name, birth_date, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<BabyRow>();

  if (error) {
    throw error;
  }

  return data ? mapBaby(data) : null;
}

export async function createSupabaseBaby(
  client: SupabaseClient,
  userId: string,
  input: CreateBabyInput,
): Promise<BabyProfile> {
  const { data, error } = await client
    .from("babies")
    .insert({
      owner_id: userId,
      name: input.name,
      birth_date: input.birthDate,
    })
    .select("id, owner_id, name, birth_date, created_at")
    .single<BabyRow>();

  if (error) {
    throw error;
  }

  return mapBaby(data);
}

export async function listSupabaseEvents(
  client: SupabaseClient,
  babyId: string,
): Promise<BabyEvent[]> {
  const { data, error } = await client
    .from("events")
    .select(
      "id, user_id, baby_id, event_type, occurred_at, ended_at, amount_ml, poop_amount, poop_color, note, created_at",
    )
    .eq("baby_id", babyId)
    .order("occurred_at", { ascending: false })
    .returns<EventRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapEvent);
}

export async function createSupabaseEvent(
  client: SupabaseClient,
  userId: string,
  input: CreateEventInput,
): Promise<BabyEvent> {
  const { data, error } = await client
    .from("events")
    .insert({
      user_id: userId,
      baby_id: input.babyId,
      event_type: input.eventType,
      occurred_at: new Date(input.occurredAt).toISOString(),
      ended_at: input.endedAt ? new Date(input.endedAt).toISOString() : null,
      amount_ml: input.amountMl ?? null,
      poop_amount: input.poopAmount ?? null,
      poop_color: input.poopColor ?? null,
      note: input.note || null,
    })
    .select(
      "id, user_id, baby_id, event_type, occurred_at, ended_at, amount_ml, poop_amount, poop_color, note, created_at",
    )
    .single<EventRow>();

  if (error) {
    throw error;
  }

  return mapEvent(data);
}

export async function updateSupabaseEvent(
  client: SupabaseClient,
  userId: string,
  input: UpdateEventInput,
): Promise<BabyEvent> {
  const { data, error } = await client
    .from("events")
    .update({
      event_type: input.eventType,
      occurred_at: new Date(input.occurredAt).toISOString(),
      ended_at: input.endedAt ? new Date(input.endedAt).toISOString() : null,
      amount_ml: input.amountMl ?? null,
      poop_amount: input.poopAmount ?? null,
      poop_color: input.poopColor ?? null,
      note: input.note || null,
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select(
      "id, user_id, baby_id, event_type, occurred_at, ended_at, amount_ml, poop_amount, poop_color, note, created_at",
    )
    .single<EventRow>();

  if (error) {
    throw error;
  }

  return mapEvent(data);
}

export async function deleteSupabaseEvent(
  client: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const { error } = await client.from("events").delete().eq("id", eventId).eq("user_id", userId);

  if (error) {
    throw error;
  }
}
