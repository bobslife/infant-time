import assert from "node:assert/strict";
import test from "node:test";

import {
  createDeliveryFailure,
  getRetryAttempt,
  isPermanentTokenError,
  parseProviderError,
} from "./feeding-reminder-policy.ts";

test("parses provider errors without throwing on non-JSON responses", () => {
  assert.deepEqual(parseProviderError('{"reason":"Unregistered"}'), { reason: "Unregistered" });
  assert.deepEqual(parseProviderError("gateway timeout"), { raw: "gateway timeout" });
  assert.equal(parseProviderError(""), null);
});

test("identifies only permanent APNs token failures", () => {
  assert.equal(isPermanentTokenError("ios", 410, { reason: "Unregistered" }), true);
  assert.equal(isPermanentTokenError("ios", 400, { reason: "BadDeviceToken" }), true);
  assert.equal(isPermanentTokenError("ios", 400, { reason: "DeviceTokenNotForTopic" }), true);
  assert.equal(isPermanentTokenError("ios", 429, { reason: "TooManyRequests" }), false);
});

test("schedules bounded retries only for transient failures", () => {
  const first = createDeliveryFailure({ platform: "ios", status: 503, detail: null, attempt: 1, nowMs: 0 });
  assert.equal(first.retryable, true);
  assert.equal(first.next_retry_at, "1970-01-01T00:10:00.000Z");
  assert.equal(getRetryAttempt(first, 9 * 60_000), null);
  assert.equal(getRetryAttempt(first, 10 * 60_000), 2);

  const final = createDeliveryFailure({ platform: "ios", status: 503, detail: null, attempt: 3, nowMs: 0 });
  assert.equal(final.retryable, false);
  assert.equal(getRetryAttempt(final, 60 * 60_000), null);

  const permanent = createDeliveryFailure({ platform: "ios", status: 410, detail: { reason: "Unregistered" }, attempt: 1, nowMs: 0 });
  assert.equal(permanent.retryable, false);
});
