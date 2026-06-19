type PushRequest = {
  babyId?: string;
  token?: string;
  platform?: "ios" | "android";
  title?: string;
  body?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const textEncoder = new TextEncoder();

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
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64Url(signature)}`,
    }),
  });
  const responsePayload = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !responsePayload.access_token) {
    throw new Error(responsePayload.error_description ?? "Firebase access token 발급에 실패했습니다.");
  }

  return responsePayload.access_token;
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const input = await request.json() as PushRequest;
    const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.infanttime.app";
    const apnsEnvironment = Deno.env.get("APNS_ENV") ?? "production";
    const host = apnsEnvironment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    const token = input.token?.trim();

    if (!token) {
      return Response.json({ error: "missing_token" }, { status: 400, headers: corsHeaders });
    }

    if (input.platform === "android") {
      const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
      if (!projectId) {
        throw new Error("FIREBASE_PROJECT_ID 환경변수가 필요합니다.");
      }

      const accessToken = await createFirebaseAccessToken();
      const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: input.title ?? "앙팡타임",
              body: input.body ?? "푸시 알림 연결 테스트입니다.",
            },
            data: {
              babyId: input.babyId ?? "",
              source: "supabase-edge-spike",
            },
            android: {
              priority: "high",
              notification: { sound: "default" },
            },
          },
        }),
      });
      const responseText = await fcmResponse.text();
      if (!fcmResponse.ok) {
        return Response.json(
          {
            error: "fcm_request_failed",
            status: fcmResponse.status,
            detail: parseApnsError(responseText),
          },
          { status: 502, headers: corsHeaders },
        );
      }

      return Response.json(
        {
          ok: true,
          providerMessageId: (() => {
            try {
              return (JSON.parse(responseText) as { name?: string }).name ?? null;
            } catch {
              return null;
            }
          })(),
        },
        { headers: corsHeaders },
      );
    }

    const jwt = await createApnsJwt();
    const apnsResponse = await fetch(`https://${host}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-topic": bundleId,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: {
          alert: {
            title: input.title ?? "앙팡타임",
            body: input.body ?? "푸시 알림 연결 테스트입니다.",
          },
          sound: "default",
        },
        babyId: input.babyId,
        source: "supabase-edge-spike",
      }),
    });

    const responseText = await apnsResponse.text();

    if (!apnsResponse.ok) {
      const detail = parseApnsError(responseText);
      console.error("APNs request failed", {
        status: apnsResponse.status,
        detail,
        environment: apnsEnvironment,
        bundleId,
      });

      return Response.json(
        {
          error: "apns_request_failed",
          status: apnsResponse.status,
          detail,
        },
        { status: 502, headers: corsHeaders },
      );
    }

    return Response.json(
      { ok: true, apnsId: apnsResponse.headers.get("apns-id") },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Push spike failed", error);

    return Response.json(
      { error: "push_spike_failed", message: error instanceof Error ? error.message : "unknown_error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
