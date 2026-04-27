import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AppUser,
  BabyEvent,
  BabyProfile,
  CreateBabyInput,
  CreateEventInput,
  JoinBabyInput,
  UpdateEventInput,
} from "../../types";

interface BabyRow {
  id: string;
  owner_id: string;
  name: string;
  birth_date: string;
  invite_code: string;
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

interface BabyMemberRow {
  baby_id: string;
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
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    "",
  );
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

export async function listSupabaseBabies(
  client: SupabaseClient,
  userId: string,
): Promise<BabyProfile[]> {
  const { data: owned, error: ownedError } = await client
    .from("babies")
    .select("id, owner_id, name, birth_date, invite_code, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .returns<BabyRow[]>();

  if (ownedError) {
    throw ownedError;
  }

  const { data: memberships, error: membershipError } = await client
    .from("baby_members")
    .select("baby_id")
    .eq("user_id", userId)
    .returns<BabyMemberRow[]>();

  if (membershipError) {
    throw membershipError;
  }

  const ownedIds = new Set(owned.map((row) => row.id));
  const memberBabyIds = memberships
    .map((membership) => membership.baby_id)
    .filter((babyId) => !ownedIds.has(babyId));

  if (memberBabyIds.length === 0) {
    return owned.map(mapBaby);
  }

  const { data: joined, error: joinedError } = await client
    .from("babies")
    .select("id, owner_id, name, birth_date, invite_code, created_at")
    .in("id", memberBabyIds)
    .order("created_at", { ascending: true })
    .returns<BabyRow[]>();

  if (joinedError) {
    throw joinedError;
  }

  return [...owned, ...joined].map(mapBaby);
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
      invite_code: generateInviteCode(),
    })
    .select("id, owner_id, name, birth_date, invite_code, created_at")
    .single<BabyRow>();

  if (error) {
    throw error;
  }

  return mapBaby(data);
}

export async function joinSupabaseBaby(
  client: SupabaseClient,
  userId: string,
  input: JoinBabyInput,
): Promise<BabyProfile> {
  const { data, error } = await client.rpc("join_baby_by_invite_code", {
    target_invite_code: input.inviteCode.trim().toUpperCase(),
    target_user_id: userId,
  }).single<BabyRow>();

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
