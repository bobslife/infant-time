# Infant Time AdMob Native Banner Checklist

`Infant Time`은 Capacitor 기반 iOS/Android 앱이므로, AdMob 배너는 웹용 AdSense와 분리해서 검토한다.

## 1. 준비물

- Google AdMob 계정
- iOS 앱 등록
- Android 앱 등록
- 각 플랫폼별 Ad Unit ID
- App Store Connect 개인정보처리방침 URL
- 앱 심사용 테스트 계정

## 2. 플랫폼별 설정

### iOS

- `GADApplicationIdentifier`를 `ios/App/App/Info.plist`에 추가
- `SKAdNetworkItems`를 추가
- `NSUserTrackingUsageDescription` 문구 추가
- 필요하면 ATT 동의 흐름 추가
- Xcode에서 Google Mobile Ads SDK 또는 AdMob 플러그인 연결

### Android

- `com.google.android.gms.ads.APPLICATION_ID`를 `android/app/src/main/AndroidManifest.xml`에 추가
- `android/app/src/main/res/values/strings.xml`에 AdMob App ID 추가
- Google Mobile Ads SDK 연결

## 3. Capacitor 플러그인

- AdMob 플러그인 선택
- 현재 앱은 Capacitor 8 기반이므로 플러그인 호환성 확인
- 초기화 API 확인
- banner show/hide/remove API 확인
- 테스트 디바이스 지정 방법 확인

## 4. 환경변수

- `VITE_AD_MODE=off | mock | sponsor | admob`
- `VITE_ADMOB_IOS_APP_ID`
- `VITE_ADMOB_ANDROID_APP_ID`
- `VITE_ADMOB_IOS_BANNER_HOME_BOTTOM`
- `VITE_ADMOB_IOS_BANNER_ACTIVITY_BOTTOM`
- `VITE_ADMOB_IOS_BANNER_ANALYSIS_BOTTOM`
- `VITE_ADMOB_IOS_BANNER_GROWTH_BOTTOM`
- `VITE_ADMOB_IOS_BANNER_PROFILE_BOTTOM`
- Android용 slot도 동일하게 분리

## 5. 코드 작업

- 광고 공통 컴포넌트는 유지
- `web`이면 mock 또는 AdSense
- `native`이면 AdMob 배너
- 하단 탭 바로 위만 노출
- 수유/수면/기저귀 입력 영역에는 노출하지 않음
- Bottom Sheet 내부에는 광고를 넣지 않음

## 6. 화면 배치

- 홈: 최근 기록 아래
- 활동: 입력 카드 아래
- 분석: 페이지 하단
- 성장: 차트 아래
- 프로필: 설정 카드 아래

## 7. iOS 심사 체크

- 테스트 광고로 확인
- 실제 광고는 승인 전에는 사용하지 않음
- 개인정보처리방침에 광고 관련 내용 반영
- App Store Connect App Privacy 항목 갱신
- 연령 등급 질문 확인

## 8. 테스트 순서

1. 시뮬레이터가 아니라 실기기에서 실행
2. 배너 로딩 확인
3. 탭 전환 시 광고 레이아웃 무너짐 확인
4. Bottom Sheet 열고 닫기 동작 확인
5. 광고가 입력 버튼을 가리지 않는지 확인
6. 스크롤 시 하단 탭과 겹치지 않는지 확인

## 9. 운영 체크

- 광고 모드 `off`와 `mock`을 배포 환경에서 쉽게 전환 가능하게 유지
- AdMob 승인 대기 중에는 `mock` 또는 `off` 사용
- 실제 배포 전에는 앱 리뷰용 빌드와 동일한 광고 정책을 재확인

## 10. 이번 프로젝트에서 당장 해야 할 일

- AdMob 플러그인 선정
- iOS / Android App ID 발급
- 배너 Ad Unit 생성
- 테스트 광고로 배너 컴포넌트 연결
- `README.md`와 `.env.example`에 AdMob 항목 추가
- App Privacy와 개인정보처리방침 업데이트

