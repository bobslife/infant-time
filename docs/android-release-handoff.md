# Android Build & Release Handoff

## 목표

Android를 iOS와 같은 핵심 기능 수준으로 배포한다. 웹 화면만 동작하는 APK가 아니라 기록, 광고, 푸시 알림, 홈 위젯, 업데이트 이동, 스토어 개인정보 항목까지 실제 운영 가능한 상태를 완료 기준으로 삼는다.

## 현재 완료된 기반

- Capacitor Android 프로젝트와 `com.infanttime.app` application ID가 존재한다.
- target SDK 36, min SDK 24로 설정되어 있다.
- AdMob 플러그인과 Android App ID가 연결되어 있다.
- `POST_NOTIFICATIONS` 권한이 manifest에 선언되어 있다.
- Android 홈 위젯이 추가되어 웹 앱의 오늘 요약을 공유한다.
  - 아기 이름
  - 마지막 수유
  - 오늘 분유량/모유 시간
  - 수면 시간과 진행 상태
  - 기저귀 횟수
- 위젯을 누르면 메인 앱을 연다.
- 앱 로그아웃 또는 선택 아기 해제 시 Android 위젯 데이터도 지우도록 공통 브리지가 연결되어 있다.

## 출시 전 필수 과제

### 1. Java/Android 빌드 환경

- Capacitor가 생성한 `android/app/capacitor.build.gradle`의 Java 21 호환 설정에 맞춰 JDK 21을
  설치하거나 Android Studio 내장 JBR 경로를 `JAVA_HOME`으로 설정한다.
- 현재 개발 환경에서는 임시 JDK까지 준비했지만 Gradle distribution 다운로드가 네트워크 제한으로
  차단되어 `./gradlew assembleDebug` 검증을 완료하지 못했다.
- 실행:

```bash
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

- `.github/workflows/android-build.yml`이 main push와 PR에서 JDK 21, 웹 빌드, Capacitor sync,
  debug APK 컴파일을 자동 검증한다.

### 2. 서명과 버전

- Play App Signing을 활성화한다.
- 업로드 키스토어를 생성하고 저장 위치/암호를 안전한 비밀 저장소에 보관한다.
- 로컬 `keystore.properties`를 Git에 커밋하지 않는다.
- `android/app/build.gradle`의 `versionCode`, `versionName`을 iOS 출시 버전과 함께 올린다.
- 현재 Android 값은 iOS와 맞춘 `versionCode 8`, `versionName 1.0.8`이다.

### 3. Android 푸시 알림

- Android FCM 토큰 등록과 FCM HTTP v1 발송 코드가 추가되어 있다.
- `supabase/migrations/20260619_android_push.sql`을 적용해 `push_tokens.platform = android`를 허용해야 한다.
- Firebase 프로젝트에 Android 앱 `com.infanttime.app`을 등록한다.
- `google-services.json`을 로컬/CI 보안 파일로 공급한다.
- Supabase secrets에 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`를 등록한다.
- `send-feeding-reminders`, `send-test-push` Edge Function을 재배포한다.
- 중복 발송 방지 키와 사용자·아기별 설정은 기존 `feeding_reminder_deliveries` 구조를 재사용한다.
- Android 13 이상에서 알림 권한 허용/거절/설정 이동 문구를 Android 표현으로 제공한다.
- Firebase 설정과 Edge Function 배포 전에는 코드가 있어도 실제 Android 알림은 발송되지 않는다.

### 4. 위젯 실기기 검증

- 2x2 이상 홈 위젯 추가, 크기 조절, 앱 재시작, 로그아웃을 확인한다.
- 분유/모유/수면/기저귀 저장 직후 위젯 갱신을 확인한다.
- 제조사 런처별로 최소 Samsung One UI와 Pixel Launcher에서 확인한다.
- iOS 위젯의 상세 디자인을 그대로 복제하기보다 Android 위젯의 작은 면적에서 마지막 수유와 현재 수면 상태가 먼저 읽히는지 검증한다.

### 5. 스토어·정책

- Play Console 앱 생성 및 개인정보처리방침 URL 등록
- 제출용 문구와 Data safety 초안은 `docs/play-store-metadata-draft.md` 참고
- Data safety 작성: 계정, 아기 프로필, 건강·활동 기록, 광고 ID, 푸시 토큰
- 광고 포함 여부와 아동 대상 여부를 실제 정책에 맞게 답변
- 콘텐츠 등급 설문
- 내부 테스트 트랙에 AAB 업로드
- 테스트 계정과 초대 코드 플로우 제공
- 강제 업데이트용 Android Play Store URL 환경변수 설정

### 6. 광고

- AdMob Android 앱/배너 단위가 운영 계정에 존재하는지 확인한다.
- 개발·내부 테스트에서는 테스트 광고만 사용한다.
- 홈/분석/성장/프로필 배너가 하단 탭, 입력 모달, 저장 피드백을 가리지 않는지 실기기에서 확인한다.

## 보호자 관점 Android QA

- 한 손으로 홈 진입 후 모유/분유/수면/기저귀를 2탭 안에 기록할 수 있는가
- 저장 직후 수정·취소가 시스템 뒤로 가기와 충돌하지 않는가
- 패턴/분석에서 전날·오늘 이동이 Android 날짜 선택기와 자연스럽게 동작하는가
- 글꼴 배율 130~150%에서 핵심 수치와 버튼이 잘리지 않는가
- 위젯만 보고 마지막 수유, 오늘 섭취량, 현재 수면 상태를 오해 없이 파악할 수 있는가
- 오프라인 또는 느린 네트워크에서 저장 실패가 성공처럼 보이지 않는가

## 완료 정의

- `assembleDebug`와 `bundleRelease` 성공
- 내부 테스트 AAB 설치 성공
- 로그인, 기록 CRUD, 광고, 알림, 위젯, 강제 업데이트 이동 실기기 통과
- Play Console 필수 정책 항목과 스토어 메타데이터 입력 완료
- iOS와 Android의 차이가 플랫폼 제약에 의한 것인지, 미구현인지 문서상 구분됨
