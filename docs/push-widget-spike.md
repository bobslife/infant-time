# Push / Widget Spike

## Product Decision: Feeding Reminder Push

요구사항:

- 홈 탭에서 사용자가 지정한 아기별 수유 간격을 서버에 저장한다.
- 마지막 수유 기록 기준으로 설정 간격이 지나면 `수유할 시간이에요!` 알림을 보낸다.
- 마지막 수유가 새로 추가/수정/삭제되면 다음 알림 기준도 다시 계산한다.

현재 백엔드 MVP 정책:

- 기준 시각: 수유 기록의 `occurred_at`.
- 설정 간격: `feeding_reminder_settings.interval_minutes`를 사용한다.
- 설정 범위: 30분~12시간.
- 기본값: 설정 row가 없으면 3시간으로 간주한다.
- 설정 저장: 홈 탭 수유 간격 칩을 변경하거나 앱이 아기 데이터를 로드할 때 `feeding_reminder_settings`에 저장한다.
- 알림 설정: `feeding_reminder_settings.enabled`에서 아기/사용자별 opt-out을 지원한다. 설정 row가 없으면 활성으로 간주한다.
- 알림 문구:
  - 제목: `수유할 시간이에요!`
  - 본문: `{아기 이름} 수유할 시간이에요! 마지막 수유 후 설정한 간격인 3시간이 지났어요.`
- 권한 거부 시 프로필/설정 화면에 권한 꺼짐 상태를 보여주고 iOS 설정 이동 안내를 제공한다.

Remote APNs 구현:

1. Supabase cron이 Edge Function을 주기적으로 실행한다.
   - 현재 원격 프로젝트에는 `send-feeding-reminders-every-30-minutes`가 30분 주기로 등록되어 있다.
2. Edge Function이 대상자를 조회한다.
   - 활성 `push_tokens.enabled = true`
   - `feeding_reminder_settings.enabled`가 false가 아닌 사용자
   - 해당 아기의 마지막 `feed` 이벤트 `occurred_at + interval_minutes <= now()`
3. 발송 이력을 저장한다.
   - `feeding_reminder_deliveries(push_token_id, feed_event_id)` unique index로 같은 마지막 수유 기준 중복 발송을 막는다.
4. 수유 기록이 추가되면 다음 cron tick에서 자동으로 새 기준을 사용한다.

필요한 추가 Supabase secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set FEEDING_REMINDER_CRON_SECRET=...
```

`FEEDING_REMINDER_CRON_SECRET`이 설정되어 있으면 호출 시 `Authorization: Bearer ...` 또는 `x-cron-secret` 헤더가 필요하다.
옵션:

- `FEEDING_REMINDER_MAX_FEEDS`: 한 번에 조회할 최대 수유 이벤트 수. 기본 5000.

배포:

```bash
supabase functions deploy send-feeding-reminders --no-verify-jwt
```

수동 호출 예:

```bash
curl -X POST \
  -H "x-cron-secret: $FEEDING_REMINDER_CRON_SECRET" \
  -H "content-type: application/json" \
  --data '{}' \
  "$SUPABASE_FUNCTION_URL/send-feeding-reminders"
```

대안:

- iOS 로컬 알림을 쓰면 서버 cron 없이 기기에서 예약할 수 있다.
- 다만 기기 변경/재설치/여러 보호자 동시 알림까지 고려하면 remote APNs + 서버 스케줄러가 더 일관적이다.
- MVP를 빠르게 검증하려면 로컬 알림, 운영형 기능은 remote APNs를 권장한다.

## Push

현재 스파이크는 Firebase 없이 APNs를 직접 사용한다.

흐름:

1. iOS 앱에서 알림 권한을 요청한다.
2. Capacitor Push Notifications 플러그인이 APNs device token을 전달한다.
3. 앱이 `push_tokens` 테이블에 token을 저장한다.
4. `send-test-push` Supabase Edge Function이 APNs HTTP/2 API로 테스트 알림을 발송한다.

필요한 Supabase secrets:

```bash
supabase secrets set APNS_KEY_ID=...
supabase secrets set APNS_TEAM_ID=...
supabase secrets set APNS_BUNDLE_ID=com.infanttime.app
supabase secrets set APNS_ENV=production
supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_G72558Q72P.p8)"
```

TestFlight가 아니라 Xcode debug build에서 테스트할 때는 `APNS_ENV=sandbox`를 사용한다.

APNs auth key 참고:

- Apple의 APNs signing key는 development와 production 환경 모두에서 동작한다.
- 새 key를 만들 필요는 없고, Debug/Xcode 설치본은 `APNS_ENV=sandbox`, TestFlight/App Store 빌드는 `APNS_ENV=production`으로 APNs endpoint만 바꾼다.
- 단, 인증서 방식이면 sandbox/production 인증서 구분이 있으므로 현재처럼 `.p8` auth key 방식인지 확인한다.

배포:

```bash
supabase functions deploy send-test-push
```

iOS Xcode 설정:

- App target에 `Push Notifications` capability 추가
- 필요 시 `Background Modes > Remote notifications` 추가
- App ID `com.infanttime.app`에서 Push Notifications 활성화

앱 테스트:

1. iOS 실기기에서 앱 실행
2. 프로필 탭 이동
3. `테스트 푸시 보내기` 탭
4. 알림 권한 허용
5. 앱을 백그라운드로 전환 후 푸시 수신 확인

## Widget

iOS 위젯은 WebView가 아니라 WidgetKit Native Extension으로 구현한다.

추천 MVP:

- Small: 마지막 수유 경과 시간, 오늘 수유량, 오늘 수면시간
- Medium: 마지막 수유 경과 시간, 오늘 수유량, 오늘 수면시간, 필요 시 마지막 수유량/기저귀 횟수

필요한 Xcode 설정:

- Widget Extension target 추가
- Main app target과 Widget target에 같은 App Group 추가
- 예: `group.com.infanttime.app`

데이터 공유:

```text
React/Capacitor 앱
  -> 오늘 요약 계산
  -> native bridge로 App Group UserDefaults 저장
  -> WidgetCenter.reloadAllTimelines()

Widget Extension
  -> App Group UserDefaults에서 요약 JSON 읽기
  -> SwiftUI로 렌더링
```

위젯 표시 정책:

- 마지막 수유가 있으면 `마지막 수유 2시간 15분 전`처럼 표시한다.
- 마지막 수유가 없으면 `수유 기록 없음`을 표시한다.
- 오늘 총 수유량은 ml 값이 있는 수유 기록만 합산한다.
- 오늘 총 수면은 앱의 오늘 요약 값을 사용한다.
- 위젯의 상대 시간은 iOS 타임라인 갱신 정책상 실시간 분 단위로 항상 즉시 바뀌지 않을 수 있다.
