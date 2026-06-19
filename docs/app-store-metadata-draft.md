# Infant Time App Store Metadata Draft

이 문서는 `Infant Time` iOS 앱의 App Store Connect 메타데이터 초안입니다.
코드 기준으로 채울 수 있는 값은 미리 채웠고, 최종 제출 전 확인이 필요한 값은
`[VERIFY_BEFORE_SUBMISSION]`으로 표시했습니다.

## 1) App Information

- App Name: `Infant Time`
- Primary Language: `Korean (ko-KR)`
- Bundle ID: `com.infanttime.app`
- SKU: `infant-time-ios-001`
- Category (Primary): `Lifestyle`
- Category (Secondary): `Health & Fitness`
- Content Rights: `No third-party content`
- Age Rating: `4+` 기준으로 진행

## 2) Version Information (1.0.8)

### Subtitle (30 chars max)

`아기 기록을 한눈에`

### Promotional Text (170 chars max)

`수유, 수면, 기저귀, 체온까지 한 번에 기록하고 오늘의 리듬을 빠르게 확인하세요. 입력은 간단하게, 요약은 더 보기 쉽게.`

### Description

Infant Time은 보호자가 아기의 하루를 쉽고 빠르게 기록할 수 있도록 만든 육아 도우미 앱입니다.

주요 기능
- 수유, 수면, 기저귀, 약 복용, 체온, 이유식, 성장 기록을 간편하게 저장
- 홈 화면에서 오늘의 상태와 다음 수유 예측을 한눈에 확인
- 날짜별 분석 화면으로 아기의 리듬을 쉽게 파악
- 빠른 입력과 수정 흐름으로 돌봄 상황에서 바로 기록
- 아기 프로필 생성 및 초대 코드 기반 가족 공유
- 프로필 화면에서 계정 삭제 지원

Infant Time은 복잡한 입력보다 빠른 기록과 명확한 요약에 집중합니다.  
실제 육아 상황에서 필요한 내용을 몇 번의 탭만으로 남기고, 홈 화면과 분석 화면에서 오늘의 흐름을 편하게 확인할 수 있습니다.

### Keywords (100 chars max, comma-separated)

`아기,육아,수유,수면,기저귀,이유식,성장기록,육아일지,육아기록,돌봄`

### Support URL

`https://infant-time.vercel.app/support`

### Marketing URL

`공란으로 진행`

### Privacy Policy URL

`https://infant-time.vercel.app/privacy`

## 3) App Privacy (초안)

앱 코드/정책 기반으로 보면 아래 항목이 수집됩니다.

- Contact Info
  - Name
  - Email Address
- User Content
  - Baby profile data
  - Care log data (feed/sleep/diaper/medicine/temperature/meal/growth/note)
- Identifiers
  - User ID (서비스 계정 식별자)
- Usage Data
  - Account create/delete timestamps, record timestamps

기본 분류 초안:
- Data Used to Track You: `[VERIFY_BEFORE_SUBMISSION]`
- Data Linked to the User: `Yes` (계정/기록 데이터)
- Tracking (ATT): `[VERIFY_BEFORE_SUBMISSION]`

AdMob 운영 광고를 활성화하면 Google Mobile Ads SDK가 IP 주소, 앱 상호작용, 진단 정보, 광고 ID를
처리할 수 있다. 실제 SDK 버전, 맞춤형 광고 설정, ATT/동의 흐름을 확인한 뒤 App Privacy 답변을
확정해야 한다. 아기 프로필과 돌봄 기록은 광고 개인화에 제공하지 않는다.

## 4) Review Information

- Contact First Name: `Chanmin`
- Contact Last Name: `Park`
- Contact Phone: `+82-10-7332-2348`
- Contact Email: `devbob0701@gmail.com`
- Demo Account Required: `Yes` (로그인 앱)
  - Username: `[VERIFY_BEFORE_SUBMISSION: test@test.com]`
  - Password: `[VERIFY_BEFORE_SUBMISSION: test1234]`
- Additional Notes: `Infant Time은 아기의 수유, 수면, 기저귀, 약 복용, 체온, 이유식 기록을 관리하는 앱입니다. 로그인 후 홈 화면에서 오늘의 요약과 다음 수유 예측을 확인할 수 있고, 활동 탭에서 기록을 빠르게 추가하거나 수정할 수 있습니다. 문제가 있으면 devbob0701@gmail.com으로 문의해 주세요. 개인정보 관련 내용은 /privacy, 앱 사용 문의는 /support에서 확인할 수 있습니다.`

## 5) Review Notes (KR/EN Ready to Paste)

### Korean

Infant Time은 아기의 수유, 수면, 기저귀, 약 복용, 체온, 이유식 기록을 관리하는 앱입니다.  
로그인 후 홈 화면에서 오늘의 요약과 다음 수유 예측을 확인할 수 있고, 활동 탭에서 기록을 빠르게 추가하거나 수정할 수 있습니다.

- 심사 계정: `[VERIFY_BEFORE_SUBMISSION]`
- 문의: devbob0701@gmail.com
- 개인정보처리방침: https://infant-time.vercel.app/privacy
- 지원 페이지: https://infant-time.vercel.app/support

### English

Infant Time is an app for tracking infant care records, including feeding, sleep, diaper changes, medication, temperature, and meals.  
After signing in, you can check today's summary and next feeding estimate on the home screen, then add or edit records quickly from the activity tab.

- Review account: `[VERIFY_BEFORE_SUBMISSION]`
- Contact: devbob0701@gmail.com
- Privacy Policy: https://infant-time.vercel.app/privacy
- Support: https://infant-time.vercel.app/support

## 6) Release Setup Checklist

- [ ] App Store Connect 앱 레코드 생성
- [ ] 아이콘 1024x1024 업로드
- [ ] iPhone 스크린샷 업로드 (6.9"/6.5" 최소 1세트 권장)
- [ ] Privacy Policy URL 입력
- [ ] App Privacy 설문 입력
- [ ] 심사용 테스트 계정 입력
- [ ] Export Compliance 응답
- [ ] 빌드 업로드 후 버전 연결
- [ ] Submit for Review

## 7) Notes from Current Codebase

- 앱명/번들ID: `capacitor.config.ts` 기준으로 최종 반영
- 로그인 및 계정 시스템: Supabase 기반
- 계정 삭제 기능: 앱 내 제공
- 개인정보처리방침 문서: 앱 내부 `/privacy` 페이지 존재
