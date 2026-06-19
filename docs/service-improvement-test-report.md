# Service Improvement Test Report

검증일: 2026-06-19
기준 문서:

- `docs/service-improvement-handoff.md`
- `docs/service-improvement-progress.md`
- `docs/current-feature-inventory.md`
- `docs/android-release-handoff.md`

## 자동 검증

### 통과

- TypeScript project build: `tsc -b`
- Vite production build: `vite build`
- Git whitespace/error check: `git diff --check`
- Android manifest/widget XML syntax: `xmllint --noout`
- GitHub Actions workflow YAML parsing
- Supabase Edge Function TypeScript syntax transpilation
- Capacitor remote URL:
  - source config
  - iOS generated config
  - Android generated config
  - 모두 `https://infant-time.vercel.app`
- Google Play 등록정보 글자 수:
  - 앱 이름 18/30자
  - 짧은 설명 38/80자
  - 전체 설명 529/4,000자
- 공개 개인정보처리방침과 iOS/Android 스토어 초안의 AdMob 처리 문구 정합성

### 미완료

- Android `./gradlew assembleDebug`
  - 임시 JDK 환경 준비까지 완료
  - Capacitor 생성 설정이 Java 21이므로 CI도 JDK 21로 정렬
  - Gradle 8.14.3 distribution 다운로드가 현재 실행 환경의 네트워크 제한으로 실패
  - `.github/workflows/android-build.yml`에서 동일 검증을 수행하도록 추가
- Android `bundleRelease`
  - 업로드 키스토어와 Play App Signing 설정 후 수행 필요
- Supabase migration/Edge Function 원격 배포
  - Firebase secrets와 운영 프로젝트 권한 필요

## 실행한 모바일 브라우저 검증

환경: Chromium, 390×844 viewport, 로컬 미리보기 데이터

### 통과

- 처음 아기 등록 화면이 가로 overflow 없이 표시됨
- 홈의 수유 요약과 빠른 기록이 390px에서 표시됨
- 분유 저장 후 `수정`, `취소`, `닫기` 액션 표시
- 저장 취소 후 방금 생성된 이벤트 제거
- 다음 분유 입력에서 최근 분유량 재사용
- 패턴 날짜 이전 이동과 `오늘` 복귀 액션 표시
- 기록 없는 패턴에서 0 카드 대신 수유·수면 CTA 표시
- 과거 날짜 CTA가 선택 날짜로 입력 모달을 엶
- 기록 1개인 분석 화면에서 차트가 노출되지 않고 해당 기록과 다음 행동만 표시
- 분석의 `리듬에서 보기`가 같은 이벤트를 패턴에서 선택
- 선택된 패턴 기록에 시간, 핵심값, 수정/분석 액션 표시
- 확인한 화면에서 document 가로 overflow 없음
- 확인한 브라우저 흐름에서 Vite error overlay와 console error 없음

## 보호자 관점 판정

### 기록 속도

- 평소 값은 재사용하지만 시각, 메모, 체온 값, 모유 시간은 새로 입력하게 해 오기록 위험을 줄였다.
- 진행 중 수면·놀이는 홈에서 종료할 수 있고 종료 실수는 취소할 수 있다.
- 저장 또는 삭제 실수는 최근 기록을 다시 찾지 않고 즉시 복구할 수 있다.

### 하루 이해

- 기록 0~1개일 때 데이터가 충분한 것처럼 차트를 만들지 않는다.
- 기록이 충분하면 원형 리듬과 시간대 타임라인에서 실제 원기록으로 이동할 수 있다.
- 긴 공백과 수면 변화는 충분한 비교일이 있을 때만 중립적으로 표시한다.

### 일주일 이해

- 최근 7일 평균은 기록이 없는 날의 0을 포함하지 않는다.
- 수유와 수면을 분리하고, 분유와 모유도 단위를 섞지 않는다.
- 7일 추세는 값이 있는 날이 2일 이상일 때만 차트로 표시한다.

## 출시 전 필수 수동 회귀

- Supabase 계정으로 모든 기록 타입 생성·수정·삭제
- 자정을 넘는 수면 생성·수정·취소
- 네트워크 실패 중 저장값 보존
- iOS 실기기 위젯과 APNs
- Android 실기기 위젯과 FCM
- Android 13 이상 알림 권한 허용·거절
- Samsung One UI/Pixel Launcher 위젯 크기 조절
- 글꼴 배율 130~150%
- AdMob 테스트 광고와 하단 탭/스낵바 겹침
- Play 내부 테스트 AAB 설치와 강제 업데이트 이동
- Play Data safety와 공개 개인정보처리방침의 AdMob/FCM 처리 내용 최종 대조

## 현재 판정

웹/React 개선은 로컬 검증 기준 배포 후보 상태다. Android는 코드와 CI 기반은 준비됐지만 APK/AAB 컴파일, Firebase 운영 설정, 실기기, Play 내부 테스트가 완료되기 전에는 출시 완료로 판정하지 않는다.
