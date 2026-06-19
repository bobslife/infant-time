import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  platform: "ios" | "android";
};

type ReminderSetting = {
  user_id: string;
  enabled: boolean;
  interval_minutes: number;
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

async function importFirebasePrivateKey(privateKey: string) {
  const pem = normalizePrivateKey(privateKey)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function createFirebaseAccessToken() {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

  if (!clientEmail || !privateKey) {
    throw new Error("FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 환경변수가 필요합니다.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const key = await importFirebasePrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncoder.encode(signingInput),
  );
  const assertion = `${signingInput}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payloadJson = await response.json() as { access_token?: string; error_description?: string };

  if (!response.ok || !payloadJson.access_token) {
    throw new Error(payloadJson.error_description ?? "Firebase access token 발급에 실패했습니다.");
  }

  return payloadJson.access_token;
}

function parseApnsError(value: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
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

async function sendFcmPush(input: {
  token: string;
  babyId: string;
  title: string;
  body: string;
  accessToken: string;
  projectId: string;
}) {
  return fetch(`https://fcm.googleapis.com/v1/projects/${input.projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: input.token,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: {
          babyId: input.babyId,
          source: "feeding-reminder",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
      },
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
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
    let apnsJwtPromise: Promise<string> | null = null;
    let firebaseAccessTokenPromise: Promise<string> | null = null;
    let dueBabies = 0;
    let sent = 0;
    let skippedDuplicates = 0;
    let failed = 0;

    for (const [babyId, babyFeeds] of feedsByBaby.entries()) {
      const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("id,user_id,baby_id,token,platform")
        .eq("baby_id", babyId)
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

        const { data: delivery, error: deliveryError } = await supabase
          .from("feeding_reminder_deliveries")
          .insert({
            baby_id: babyId,
            user_id: token.user_id,
            push_token_id: token.id,
            feed_event_id: reminder.lastFeed.id,
            last_feed_occurred_at: reminder.lastFeed.occurred_at,
            average_interval_minutes: reminder.intervalMinutes,
            scheduled_for: reminder.scheduledFor,
            status: "pending",
          })
          .select("id")
          .single();

        if (deliveryError) {
          if (deliveryError.code === "23505") {
            skippedDuplicates += 1;
            continue;
          }

          throw deliveryError;
        }

        let pushResponse: Response;
        try {
          if (token.platform === "android" && !firebaseProjectId) {
            throw new Error("FIREBASE_PROJECT_ID 환경변수가 필요합니다.");
          }

          pushResponse =
            token.platform === "android"
              ? await sendFcmPush({
                  token: token.token,
                  babyId,
                  title,
                  body,
                  accessToken: await (
                    firebaseAccessTokenPromise ??= createFirebaseAccessToken()
                  ),
                  projectId: firebaseProjectId!,
                })
              : await sendApnsPush({
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
              error: {
                platform: token.platform,
                message,
              },
            })
            .eq("id", delivery.id);
          continue;
        }

        const responseText = await pushResponse.text();

        if (!pushResponse.ok) {
          failed += 1;
          const detail = parseApnsError(responseText);
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
              error: {
                status: pushResponse.status,
                detail,
                platform: token.platform,
              },
            })
            .eq("id", delivery.id);
          continue;
        }

        sent += 1;
        const providerMessageId =
          token.platform === "android"
            ? (() => {
                try {
                  return (JSON.parse(responseText) as { name?: string }).name ?? null;
                } catch {
                  return null;
                }
              })()
            : pushResponse.headers.get("apns-id");
        await supabase
          .from("feeding_reminder_deliveries")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            apns_id: token.platform === "ios" ? providerMessageId : null,
            provider_message_id: providerMessageId,
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
        failed,
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
