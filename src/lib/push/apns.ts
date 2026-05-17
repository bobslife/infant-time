import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  PushNotifications,
  type PushNotificationToken,
} from "@capacitor/push-notifications";
import { getSupabaseClient } from "../supabase/client";
import { AppUser, BabyProfile } from "../../types";

type PushRegistrationResult = {
  token: string;
  sent: boolean;
};

async function saveApnsToken(user: AppUser, baby: BabyProfile, token: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase 설정이 없어 푸시 토큰을 저장할 수 없어요.");
  }

  const { error } = await client.from("push_tokens").upsert(
    {
      user_id: user.id,
      baby_id: baby.id,
      platform: "ios",
      token,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function formatFunctionError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "테스트 푸시를 보낼 수 없어요.";
  const context = (error as { context?: unknown })?.context;

  if (!(context instanceof Response)) {
    return fallback;
  }

  try {
    const payload = await context.json() as {
      message?: string;
      status?: number;
      detail?: { reason?: string; raw?: string } | null;
      error?: string;
    };
    const reason = payload.detail?.reason ?? payload.detail?.raw ?? payload.message ?? payload.error;

    if (reason && payload.status) {
      return `APNs 오류 ${payload.status}: ${reason}`;
    }

    if (reason) {
      return reason;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function waitForPushToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const handles: PluginListenerHandle[] = [];
    const cleanup = () => {
      handles.forEach((handle) => void handle.remove());
    };
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("APNs 토큰 발급 시간이 초과됐어요."));
      }
    }, 15000);

    void PushNotifications.addListener("registration", (token: PushNotificationToken) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      cleanup();
      resolve(token.value);
    }).then((handle) => handles.push(handle));

    void PushNotifications.addListener("registrationError", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error(error.error || "APNs 등록에 실패했어요."));
    }).then((handle) => handles.push(handle));
  });
}

export async function registerApnsToken(user: AppUser, baby: BabyProfile): Promise<string> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    throw new Error("iOS 앱에서만 푸시 토큰을 발급할 수 있어요.");
  }

  if (user.isLocal) {
    throw new Error("로컬 미리보기 계정은 푸시 테스트를 사용할 수 없어요.");
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase 설정이 없어 푸시 토큰을 저장할 수 없어요.");
  }

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    throw new Error("알림 권한이 허용되지 않았어요.");
  }

  const tokenPromise = waitForPushToken();
  await PushNotifications.register();
  const token = await tokenPromise;

  await saveApnsToken(user, baby, token);

  return token;
}

export async function syncApnsTokenIfPermissionGranted(
  user: AppUser,
  baby: BabyProfile,
): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios" || user.isLocal) {
    return null;
  }

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    return null;
  }

  const tokenPromise = waitForPushToken();
  await PushNotifications.register();
  const token = await tokenPromise;

  await saveApnsToken(user, baby, token);
  return token;
}

export async function saveFeedingReminderInterval(
  user: AppUser,
  baby: BabyProfile,
  intervalMinutes: number,
) {
  if (user.isLocal) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const safeMinutes = Math.max(30, Math.min(720, Math.round(intervalMinutes)));
  const { error } = await client.from("feeding_reminder_settings").upsert(
    {
      baby_id: baby.id,
      user_id: user.id,
      enabled: true,
      interval_minutes: safeMinutes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "baby_id,user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadFeedingReminderInterval(
  user: AppUser,
  baby: BabyProfile,
): Promise<number | null> {
  if (user.isLocal) {
    return null;
  }

  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("feeding_reminder_settings")
    .select("interval_minutes")
    .eq("baby_id", baby.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const minutes = Number(data?.interval_minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  return Math.max(30, Math.min(720, Math.round(minutes)));
}

export async function runApnsPushSpike(user: AppUser, baby: BabyProfile): Promise<PushRegistrationResult> {
  const token = await registerApnsToken(user, baby);
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase 설정이 없어 테스트 푸시를 보낼 수 없어요.");
  }

  const { error } = await client.functions.invoke("send-test-push", {
    body: {
      babyId: baby.id,
      token,
      title: "앙팡타임 푸시 테스트",
      body: `${baby.name}의 알림 연결이 준비됐어요.`,
    },
  });

  if (error) {
    throw new Error(await formatFunctionError(error));
  }

  return { token, sent: true };
}
