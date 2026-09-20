export type PushPlatform = "ios";

export type ProviderErrorDetail = Record<string, unknown> | null;

export type DeliveryFailure = {
  platform: PushPlatform;
  status?: number;
  detail?: ProviderErrorDetail;
  message?: string;
  attempt: number;
  retryable: boolean;
  next_retry_at?: string;
};

export const maxDeliveryAttempts = 3;

export function parseProviderError(value: string): ProviderErrorDetail {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : { raw: value };
  } catch {
    return { raw: value };
  }
}

export function getProviderErrorReason(detail: ProviderErrorDetail) {
  return typeof detail?.reason === "string" ? detail.reason : null;
}

export function isPermanentTokenError(
  platform: PushPlatform,
  status: number,
  detail: ProviderErrorDetail,
) {
  const reason = getProviderErrorReason(detail);
  return (status === 410 && reason === "Unregistered") ||
    (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
}

export function isRetryableProviderStatus(status?: number) {
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

export function createDeliveryFailure(input: {
  platform: PushPlatform;
  status?: number;
  detail?: ProviderErrorDetail;
  message?: string;
  attempt: number;
  nowMs: number;
}): DeliveryFailure {
  const retryable = isRetryableProviderStatus(input.status) && input.attempt < maxDeliveryAttempts;
  const retryDelayMinutes = input.attempt === 1 ? 10 : 30;

  return {
    platform: input.platform,
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.detail === undefined ? {} : { detail: input.detail }),
    ...(input.message === undefined ? {} : { message: input.message }),
    attempt: input.attempt,
    retryable,
    ...(retryable ? { next_retry_at: new Date(input.nowMs + retryDelayMinutes * 60_000).toISOString() } : {}),
  };
}

export function getRetryAttempt(error: unknown, nowMs: number) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const value = error as Record<string, unknown>;
  if (value.retryable !== true || typeof value.next_retry_at !== "string") {
    return null;
  }

  const nextRetryMs = new Date(value.next_retry_at).getTime();
  const previousAttempt = typeof value.attempt === "number" ? value.attempt : 1;
  if (!Number.isFinite(nextRetryMs) || nowMs < nextRetryMs || previousAttempt >= maxDeliveryAttempts) {
    return null;
  }

  return previousAttempt + 1;
}
