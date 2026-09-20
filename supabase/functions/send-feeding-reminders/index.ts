import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  createDeliveryFailure,
  getRetryAttempt,
  isPermanentTokenError,
  parseProviderError,
} from "../_shared/feeding-reminder-policy.ts";

type FeedEvent = {
  id: string;
  baby_id: string;
  occurred_at: string;
};

type Baby = {
  id: string;
  name: string;
};

type PushToken = {
  id: string;
  user_id: string;
  baby_id: string;
  token: string;
  platform: "ios";
};

type ReminderSetting = {
  user_id: string;
  enabled: boolean;
  interval_minutes: number;
};

type Delivery = {
  id: string;
  status: "pending" | "sent" | "failed";
  error: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const textEncoder = new TextEncoder();
const defaultIntervalMinutes = 180;
const reminderGraceMinutes = 10;
const minIntervalMinutes = 30;
const maxIntervalMinutes = 12 * 60;

function base64Url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

async function importApnsPrivateKey(privateKey: string) {
  const pem = normalizePrivateKey(privateKey)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function createApnsJwt() {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY");

  if (!keyId || !teamId || !privateKey) {
    throw new Error("APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY 환경변수가 필요합니다.");
  }

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64Url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signingInput = `${header}.${payload}`;
  const key = await importApnsPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    textEncoder.encode(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

function requireCronSecret(request: Request) {
  const expected = Deno.env.get("FEEDING_REMINDER_CRON_SECRET");

  if (!expected) {
    return true;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7) : "";
  return request.headers.get("x-cron-secret") === expected || bearer === expected;
}

function clampInterval(minutes: number) {
  return Math.min(maxIntervalMinutes, Math.max(minIntervalMinutes, Math.round(minutes)));
}

function calculateDueReminder(events: FeedEvent[], intervalMinutes: number, nowMs: number) {
  const sorted = [...events].sort(
    (left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
  );
  const lastFeed = sorted[0];

  if (!lastFeed) {
    return null;
  }

  const safeIntervalMinutes = clampInterval(intervalMinutes);
  const scheduledForMs = new Date(lastFeed.occurred_at).getTime() + (safeIntervalMinutes + reminderGraceMinutes) * 60_000;

  if (nowMs < scheduledForMs) {
    return null;
  }

  return {
    lastFeed,
    intervalMinutes: safeIntervalMinutes,
    scheduledFor: new Date(scheduledForMs).toISOString(),
  };
}

async function sendApnsPush(input: {
  token: string;
  babyId: string;
  title: string;
  body: string;
  jwt: string;
  host: string;
  bundleId: string;
}) {
  return fetch(`https://${input.host}/3/device/${input.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${input.jwt}`,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-topic": input.bundleId,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: {
        alert: {
          title: input.title,
          body: input.body,
        },
        sound: "default",
      },
      babyId: input.babyId,
      source: "feeding-reminder",
    }),
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
  }

  if (!requireCronSecret(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = new Date();
    const nowMs = now.getTime();
    const maxFeeds = Number(Deno.env.get("FEEDING_REMINDER_MAX_FEEDS") ?? "5000");

    const { data: feeds, error: feedsError } = await supabase
      .from("events")
      .select("id,baby_id,occurred_at")
      .eq("event_type", "feed")
      .lte("occurred_at", now.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(maxFeeds);

    if (feedsError) {
      throw feedsError;
    }

    const feedsByBaby = new Map<string, FeedEvent[]>();
    for (const feed of (feeds ?? []) as FeedEvent[]) {
      const existing = feedsByBaby.get(feed.baby_id) ?? [];
      existing.push(feed);
      feedsByBaby.set(feed.baby_id, existing);
    }

    const babyIds = [...feedsByBaby.keys()];
    const babyNames = new Map<string, string>();
    const { data: babies, error: babiesError } = await supabase
      .from("babies")
      .select("id,name")
      .in("id", babyIds);

    if (babiesError) {
      throw babiesError;
    }

    for (const baby of (babies ?? []) as Baby[]) {
      babyNames.set(baby.id, baby.name);
    }

    const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.infanttime.app";
    const apnsEnvironment = Deno.env.get("APNS_ENV") ?? "production";
    const host = apnsEnvironment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    let apnsJwtPromise: Promise<string> | null = null;
    let dueBabies = 0;
    let sent = 0;
    let skippedDuplicates = 0;
    let retried = 0;
    let failed = 0;
    let disabledTokens = 0;

    for (const [babyId, babyFeeds] of feedsByBaby.entries()) {
      const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("id,user_id,baby_id,token,platform")
        .eq("baby_id", babyId)
        .eq("platform", "ios")
        .eq("enabled", true);

      if (tokensError) {
        throw tokensError;
      }

      if (!tokens?.length) {
        continue;
      }

      const userIds = [...new Set((tokens as PushToken[]).map((token) => token.user_id))];
      const { data: settings, error: settingsError } = await supabase
        .from("feeding_reminder_settings")
        .select("user_id,enabled,interval_minutes")
        .eq("baby_id", babyId)
        .in("user_id", userIds);

      if (settingsError) {
        throw settingsError;
      }

      const enabledByUser = new Map(
        ((settings ?? []) as ReminderSetting[]).map((setting) => [setting.user_id, setting.enabled]),
      );
      const intervalByUser = new Map(
        ((settings ?? []) as ReminderSetting[]).map((setting) => [
          setting.user_id,
          clampInterval(setting.interval_minutes ?? defaultIntervalMinutes),
        ]),
      );
      const babyName = babyNames.get(babyId);
      const title = "아기가 배고파해요";
      let babyHadDueReminder = false;

      for (const token of tokens as PushToken[]) {
        if (enabledByUser.get(token.user_id) === false) {
          continue;
        }

        const intervalMinutes = intervalByUser.get(token.user_id) ?? defaultIntervalMinutes;
        const reminder = calculateDueReminder(babyFeeds, intervalMinutes, nowMs);

        if (!reminder) {
          continue;
        }

        babyHadDueReminder = true;
        const bodyPrefix = babyName ? `${babyName} ` : "";
        const body = `${bodyPrefix}수유 시간이 지났어요.`;

        const { data: insertedDeliveries, error: deliveryError } = await supabase
          .from("feeding_reminder_deliveries")
          .upsert({
            baby_id: babyId,
            user_id: token.user_id,
            push_token_id: token.id,
            feed_event_id: reminder.lastFeed.id,
            last_feed_occurred_at: reminder.lastFeed.occurred_at,
            average_interval_minutes: reminder.intervalMinutes,
            scheduled_for: reminder.scheduledFor,
            status: "pending",
          }, {
            onConflict: "push_token_id,feed_event_id",
            ignoreDuplicates: true,
          })
          .select("id,status,error");

        if (deliveryError) {
          throw deliveryError;
        }

        let delivery = (insertedDeliveries?.[0] ?? null) as Delivery | null;
        let attempt = 1;

        if (!delivery) {
          const { data: existingDelivery, error: existingDeliveryError } = await supabase
            .from("feeding_reminder_deliveries")
            .select("id,status,error")
            .eq("push_token_id", token.id)
            .eq("feed_event_id", reminder.lastFeed.id)
            .maybeSingle();

          if (existingDeliveryError) {
            throw existingDeliveryError;
          }

          const retryAttempt = existingDelivery?.status === "failed"
            ? getRetryAttempt(existingDelivery.error, nowMs)
            : null;

          if (!existingDelivery || retryAttempt === null) {
            skippedDuplicates += 1;
            continue;
          }

          const { data: claimedDeliveries, error: claimError } = await supabase
            .from("feeding_reminder_deliveries")
            .update({ status: "pending" })
            .eq("id", existingDelivery.id)
            .eq("status", "failed")
            .select("id,status,error");

          if (claimError) {
            throw claimError;
          }

          delivery = (claimedDeliveries?.[0] ?? null) as Delivery | null;
          if (!delivery) {
            skippedDuplicates += 1;
            continue;
          }

          attempt = retryAttempt;
          retried += 1;
        }

        let pushResponse: Response;
        try {
          pushResponse = await sendApnsPush({
            token: token.token,
            babyId,
            title,
            body,
            jwt: await (apnsJwtPromise ??= createApnsJwt()),
            host,
            bundleId,
          });
        } catch (providerError) {
          failed += 1;
          const message = providerError instanceof Error ? providerError.message : "push_provider_error";
          const failure = createDeliveryFailure({
            platform: token.platform,
            message,
            attempt,
            nowMs: Date.now(),
          });
          console.error("Push provider setup failed", {
            babyId,
            tokenId: token.id,
            platform: token.platform,
            message,
          });
          await supabase
            .from("feeding_reminder_deliveries")
            .update({
              status: "failed",
              error: failure,
            })
            .eq("id", delivery.id);
          continue;
        }

        const responseText = await pushResponse.text();

        if (!pushResponse.ok) {
          failed += 1;
          const detail = parseProviderError(responseText);
          const failure = createDeliveryFailure({
            platform: token.platform,
            status: pushResponse.status,
            detail,
            attempt,
            nowMs: Date.now(),
          });
          console.error("Push feeding reminder failed", {
            status: pushResponse.status,
            detail,
            babyId,
            tokenId: token.id,
            platform: token.platform,
          });

          await supabase
            .from("feeding_reminder_deliveries")
            .update({
              status: "failed",
              error: failure,
            })
            .eq("id", delivery.id);

          if (isPermanentTokenError(token.platform, pushResponse.status, detail)) {
            const { error: disableTokenError } = await supabase
              .from("push_tokens")
              .update({ enabled: false })
              .eq("id", token.id)
              .eq("token", token.token);

            if (disableTokenError) {
              console.error("Failed to disable invalid push token", {
                tokenId: token.id,
                platform: token.platform,
                message: disableTokenError.message,
              });
            } else {
              disabledTokens += 1;
            }
          }
          continue;
        }

        sent += 1;
        const apnsId = pushResponse.headers.get("apns-id");
        await supabase
          .from("feeding_reminder_deliveries")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            apns_id: apnsId,
            error: null,
          })
          .eq("id", delivery.id);
      }

      if (babyHadDueReminder) {
        dueBabies += 1;
      }
    }

    return Response.json(
      {
        ok: true,
        checkedBabies: feedsByBaby.size,
        dueBabies,
        sent,
        skippedDuplicates,
        retried,
        failed,
        disabledTokens,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Feeding reminders failed", error);

    return Response.json(
      { error: "feeding_reminders_failed", message: error instanceof Error ? error.message : "unknown_error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
