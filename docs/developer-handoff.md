# Developer Handoff: Account-Based MVP

## 목적

기존 로컬 저장 중심 MVP를 실사용 가능한 계정 기반 MVP로 확장한다. 이메일/비밀번호 회원가입과 로그인, 자동 로그인 세션 유지, 최초 아기 프로필 등록, 하단 탭 UI, 수유/수면/소변/대변 입력, Supabase 저장을 한 번에 구현한다.

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
  - 입력
  - 프로필
- 홈 화면 헤드라인에 아기 이름 표시
- 마지막 수유 경과 시간은 마지막 수유 카드 안에 `지금으로부터 n시간 n분 전` 형태로 표시
- `최신순 목록` 문구 제거
- 입력 화면에서 수유, 수면, 소변, 대변 4개 타입 지원
- 기록 타입 선택은 아이콘 + 문구 버튼으로 제공
- 수유량 입력 추가
  - 기본값 100ml
  - 범위 0ml ~ 300ml
  - 5ml 단위
- 대변 양과 색상 입력 추가
  - 양: 적음, 보통, 많음
  - 색상: 황토색, 갈색, 진한 갈색, 쑥색, 다홍색
- Supabase Auth, Postgres, RLS 기반으로 데이터 저장

## 권장 구현 순서

1. 타입과 데이터 모델 확장
   - `EventType`을 `feed | sleep | pee | poop`으로 확장
   - `BabyEvent`에 `babyId`, `endedAt`, `amountMl`, `poopAmount`, `poopColor`, `note` 추가
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
   - 홈/입력/프로필 화면 분리
   - 모바일 하단 고정 탭과 safe-area 고려

6. 홈 화면 개편
   - 아기 이름을 상단 주요 문구로 표시
   - 마지막 수유 카드에 상대 시간 표시
   - 최근 기록 섹션에서 `최신순 목록` 문구 제거
   - 오늘 수유/수면/소변/대변 요약 표시

7. 입력 화면 구현
   - 4개 기록 타입 선택 버튼
   - 선택 타입에 따라 입력 폼 변경
   - 수유량 슬라이더 또는 좌우 스크롤 선택 UI
   - 수면 시작/종료 시각
   - 소변 기록 시각
   - 대변 양/색상 선택

8. 저장 및 조회 연동
   - Supabase에서 이벤트 목록 조회
   - 이벤트 생성
   - 생성 후 홈 요약 및 최근 기록 갱신
   - 로컬 저장소는 개발 보조용으로 남길지 제거할지 결정

9. 검증
   - `npm run build`
   - 회원가입/로그인 전후 분기 확인
   - 회원가입 후 자동 로그인 확인
   - 새로고침 또는 재접속 시 세션 유지 확인
   - 프로필 없는 사용자 플로우 확인
   - 각 기록 타입 저장 확인
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
  event_type text not null check (event_type in ('feed', 'sleep', 'pee', 'poop')),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  amount_ml integer,
  poop_amount text check (poop_amount is null or poop_amount in ('small', 'normal', 'large')),
  poop_color text check (poop_color is null or poop_color in ('ocher', 'brown', 'dark_brown', 'green', 'red_orange')),
  note text,
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
- 마지막 수유 카드: `지금으로부터 1시간 20분 전`
- 최근 기록 섹션: `최근 기록`
- 사용하지 않을 문구:
  - `마지막 수유 ... 경과` 형태의 홈 헤드라인
  - `빠른 기록`
  - `한 번에 남기기`
  - `최신순 목록`

## 완료 후 운영자 전달 요약 후보

- 이메일/비밀번호 회원가입, 로그인, 자동 로그인 플로우 추가
- 최초 아기 프로필 등록 플로우 추가
- 홈/입력/프로필 하단 탭 구조 적용
- 수유/수면/소변/대변 기록 타입 확장
- 수유량, 대변 양/색상 등 상세 기록값 추가
- Supabase 기반 사용자별 저장 구조와 RLS 전제 반영
