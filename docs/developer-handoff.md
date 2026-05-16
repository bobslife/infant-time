# Developer Handoff: Account-Based MVP

## 목적

기존 로컬 저장 중심 MVP를 실사용 가능한 계정 기반 MVP로 확장한다. 이메일/비밀번호 회원가입과 로그인, 자동 로그인 세션 유지, 최초 아기 프로필 등록, 하단 탭 UI, 수유/수면/소변/대변/목욕/놀이 입력, Supabase 저장을 한 번에 구현한다.

기준 문서: `docs/prd-mvp.md`

## 핵심 변경점

- 이름/이메일/비밀번호 기반 회원가입 추가
- 이메일/비밀번호 로그인 추가
- 회원가입 후 자동 로그인 처리
- 세션 유지 기반 자동 로그인 처리
- 최초 아기 프로필 등록 플로우 추가
- MVP에서는 아기 1명만 지원
- 화면 구조를 하단 탭 기반으로 변경
  - 홈
  - 패턴
  - 분석
  - 성장
  - 프로필
- 하단 탭에서 기존 `활동`/`입력` 탭 제거
- 홈의 `빠른 기록 바로 남기기`를 통해 신규 입력 화면으로 이동하는 로직 유지
- 홈 화면 헤드라인에 아기 이름 표시
- 마지막 수유 경과 시간은 마지막 수유 카드 안에 `지금으로부터 n시간 n분 전` 형태로 표시
- `최신순 목록` 문구 제거
- 입력 화면에서 수유, 수면, 소변, 대변, 목욕, 놀이 타입 지원
- 기록 타입 선택은 아이콘 + 문구 버튼으로 제공
- 수유량 입력 추가
  - 기본값 100ml
  - 범위 0ml ~ 300ml
  - 5ml 단위
- 대변 양과 색상 입력 추가
  - 양: 적음, 보통, 많음
  - 색상: 황토색, 갈색, 진한 갈색, 쑥색, 다홍색
- 목욕 기록 추가
  - 기록 시각만 입력
  - 임시 아이콘 사용
- 놀이 기록 추가
  - 시작 시각, 종료 시각 입력
  - `무엇을 하고 놀았는지` 텍스트 입력
  - 임시 아이콘 사용
- 기존 분석 탭은 `분석`으로 유지하고, `패턴` 탭을 별도로 추가
- 기존 `활동` 탭 영역은 하단 탭에서 제거
- 신규 `패턴` 탭 추가
  - 날짜별 조회
  - 선택한 날짜의 하루 시간표를 파이 차트로 표시
  - 기록 유형별 요약 표시
- Supabase Auth, Postgres, RLS 기반으로 데이터 저장

## 기획 검토 결과

- 적용 가능하다.
- `목욕`은 단일 시각 이벤트이므로 기존 `occurred_at`만 사용하면 된다.
- `놀이`는 시작/종료가 있는 duration 이벤트이므로 기존 `occurred_at`, `ended_at` 구조를 재사용한다.
- 놀이 내용 입력은 신규 DB 컬럼 없이 기존 `note` 필드를 `놀이 내용` 라벨로 재사용하는 것을 기본안으로 한다.
- 하단 탭에서 입력 화면을 제거하더라도 입력 화면 컴포넌트와 저장 로직은 유지해야 한다. 홈의 빠른 기록 버튼이 입력 화면으로 전환하면서 선택 타입을 세팅하면 된다.
- 분석과 패턴은 별개의 탭이다. 분석 탭은 기존 분석 지표와 차트를 유지하고, 패턴 탭만 하루 시간표 파이 차트를 담당한다.
- 패턴 파이 차트는 `recharts`가 이미 프로젝트에 있으므로 `PieChart`/`Pie`를 사용하는 방식이 가장 작다.
- 파이 차트 지표는 MVP에서는 `횟수 기반`으로 시작한다. 수면/놀이 총 시간은 차트 아래 요약 텍스트로 노출한다.
- 단일 시각 이벤트에 임의 duration을 부여하면 사용자에게 오해가 생길 수 있으므로, duration 기반 24시간 점유율 차트는 후속 개선으로 둔다.

## 권장 구현 순서

1. 타입과 데이터 모델 확장
   - `EventType`에 `bath | play` 추가
   - `BabyEvent`에 `babyId`, `endedAt`, `amountMl`, `poopAmount`, `poopColor`, `note` 추가
   - 놀이 기록은 `note`에 놀이 내용을 저장
   - `BabyProfile` 타입 추가

2. Supabase 스키마 준비
   - `profiles`
   - `profiles.name` 포함
   - `babies`
   - `events`
   - 로그인 사용자별 RLS 정책

3. 인증 레이어 추가
   - Supabase session 조회
   - 이메일/비밀번호 회원가입
   - 이메일/비밀번호 로그인
   - 회원가입 성공 후 자동 로그인
   - 세션 유지 시 로그인 화면 생략
   - 로그아웃
   - 로그인 전 화면과 로그인 후 앱 화면 분기

4. 아기 프로필 등록 플로우 추가
   - 로그인 후 `babies` 조회
   - 없으면 등록 화면 표시
   - 등록 후 홈 화면 진입

5. 앱 레이아웃 변경
   - 하단 탭 추가
   - 홈/패턴/분석/성장/프로필 화면 분리
   - 기존 `input`/`활동` 탭 버튼 제거
   - 기존 `analysis` 탭 라벨은 `분석`으로 유지
   - 별도 `pattern` 탭 추가
   - 입력 화면은 내부 상태 또는 별도 route 상태로 유지
   - 홈 빠른 기록 버튼 클릭 시 입력 화면으로 이동하고 선택한 타입 세팅
   - 모바일 하단 고정 탭과 safe-area 고려

6. 홈 화면 개편
   - 아기 이름을 상단 주요 문구로 표시
   - 마지막 수유 카드에 상대 시간 표시
   - 최근 기록 섹션에서 `최신순 목록` 문구 제거
   - 오늘 수유/수면/소변/대변 요약 표시

7. 입력 화면 구현
   - 기록 타입 선택 버튼
   - 선택 타입에 따라 입력 폼 변경
   - 수유량 슬라이더 또는 좌우 스크롤 선택 UI
   - 수면 시작/종료 시각
   - 소변 기록 시각
   - 대변 양/색상 선택
   - 목욕 기록 시각
   - 놀이 시작/종료 시각
   - 놀이 내용 텍스트 입력
   - 목욕/놀이 아이콘은 최종 리소스 전달 전까지 기존 아이콘 중 임시 사용

8. 패턴 화면 구현
   - 분석 화면과 별도의 패턴 화면으로 구현
   - 날짜 선택 input 추가
   - 선택 날짜의 이벤트만 필터링
   - `recharts`의 `PieChart`로 24시간 원형 패턴 차트 표시
   - 30분 단위 slot으로 하루를 나누고, 입력 없는 시간대는 연한 회색으로 표시
   - 수면/놀이 duration 이벤트는 지속 시간 arc로 표시
   - 수유/기저귀/목욕 등 point 이벤트는 최소 30분 point arc로 표시
   - 동일 시간대 겹침은 대표 기록 1개 우선 표시
   - 원형 차트 아래 24시간 horizontal rhythm timeline 표시
   - 기록 유형 범례와 패턴 인사이트 문구 표시
   - 수면/놀이 총 시간, 수유량, 기저귀/목욕 횟수 요약 표시
   - 기록이 없는 날짜는 회색 원형 placeholder와 안내 문구로 빈 리듬 상태 처리

9. 저장 및 조회 연동
   - Supabase에서 이벤트 목록 조회
   - 이벤트 생성
   - 생성 후 홈 요약 및 최근 기록 갱신
   - 로컬 저장소는 개발 보조용으로 남길지 제거할지 결정

10. 검증
   - `npm run build`
   - 회원가입/로그인 전후 분기 확인
   - 회원가입 후 자동 로그인 확인
   - 새로고침 또는 재접속 시 세션 유지 확인
   - 프로필 없는 사용자 플로우 확인
   - 각 기록 타입 저장 확인
   - 홈 빠른 기록에서 목욕/놀이 입력 화면 진입 확인
   - 하단 탭에 활동/입력 탭이 보이지 않는지 확인
   - 분석 탭이 기존 분석 화면으로 유지되는지 확인
   - 패턴 탭 날짜 변경 및 파이 차트 표시 확인
   - 마지막 수유 4시간 경고 확인
   - 모바일 폭 UI 확인

## Supabase 테이블 초안

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table babies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  birth_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  baby_id uuid not null references babies(id) on delete cascade,
  event_type text not null check (event_type in ('feed', 'sleep', 'pee', 'poop', 'diaper', 'medicine', 'temperature', 'meal', 'memo', 'bath', 'play')),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  amount_ml integer,
  poop_amount text check (poop_amount is null or poop_amount in ('small', 'normal', 'large')),
  poop_color text check (poop_color is null or poop_color in ('ocher', 'brown', 'dark_brown', 'green', 'red_orange')),
  note text, -- play 이벤트에서는 놀이 내용으로 사용
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## RLS 정책 방향

- `profiles`: 본인 row만 조회/수정 가능
- `babies`: `owner_id = auth.uid()`인 row만 조회/생성/수정 가능
- `events`: `user_id = auth.uid()`이고 본인 baby에 연결된 row만 조회/생성 가능

## UI 문구 기준

- 홈 상단: `{아기 이름}`
- 하단 탭: `홈`, `패턴`, `분석`, `성장`, `프로필`
- 마지막 수유 카드: `지금으로부터 1시간 20분 전`
- 최근 기록 섹션: `최근 기록`
- 빠른 기록 섹션: `빠른 기록`, `바로 남기기`
- 놀이 입력 라벨: `무엇을 하고 놀았나요?`
- 패턴 화면 상단: 제목 문구 없이 날짜 선택만 노출
- 패턴 탭 활성 색상: 노란색 파스텔 톤
- 사용하지 않을 문구:
  - `마지막 수유 ... 경과` 형태의 홈 헤드라인
  - `최신순 목록`
  - 하단 탭의 `활동`

## 구현 대상 파일 가이드

- `src/types.ts`
  - `EventType`에 `bath`, `play` 추가
  - 별도 필드 추가 없이 `note`를 놀이 내용으로 재사용
- `src/components/EventInputScreen.tsx`
  - event option에 목욕/놀이 추가
  - 목욕 입력 UI: 날짜/시간만 노출
  - 놀이 입력 UI: 시작/종료 날짜/시간 + 놀이 내용 입력
  - 놀이 종료 시각 validation 추가
- `src/components/SummaryCards.tsx`
  - 홈 빠른 기록 액션에 목욕/놀이 추가
  - 패턴 화면에서 목욕/놀이 집계 반영
- `src/App.tsx`
  - 하단 탭에서 `input`/`활동` 제거
  - `analysis` 라벨은 `분석`으로 유지
  - 별도 `pattern` 탭 추가
  - `onQuickAdd`가 입력 화면으로 이동하는 기존 흐름 유지
- `src/features/events/useEvents.ts`
  - daily summary에 목욕/놀이 count, 놀이 total minutes 필요 여부 확인
- `src/lib/storage/localRepository.ts`
  - 로컬 저장/매핑에서 새 event type 누락 방지
- `docs/supabase-schema.sql`
  - Supabase check constraint에 `bath`, `play` 추가

## 완료 후 운영자 전달 요약 후보

- 이메일/비밀번호 회원가입, 로그인, 자동 로그인 플로우 추가
- 최초 아기 프로필 등록 플로우 추가
- 홈/패턴/분석/성장/프로필 하단 탭 구조 적용
- 수유/수면/소변/대변 기록 타입 확장
- 목욕/놀이 기록 타입 추가
- 활동/입력 탭을 제거하고 별도 패턴 탭에 날짜별 파이 차트 요약 추가
- 수유량, 대변 양/색상 등 상세 기록값 추가
- Supabase 기반 사용자별 저장 구조와 RLS 전제 반영
