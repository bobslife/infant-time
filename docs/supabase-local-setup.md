# Supabase Local Login Setup

> 현재 MVP 인증 방향은 이메일/비밀번호 회원가입과 로그인이다.

## 현재 로컬 환경

`.env.local`에 아래 값이 설정되어 있어야 한다.

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

현재 프로젝트에는 두 값이 모두 존재한다. 값은 git에 커밋하지 않는다.

## Supabase Auth 설정

Supabase Dashboard에서 아래 설정이 필요하다.

### URL Configuration

Authentication > URL Configuration

- Site URL
  - `http://127.0.0.1:3000`
- Redirect URLs
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/`
  - `http://localhost:3000`
  - `http://localhost:3000/`

로컬 서버를 `127.0.0.1`로 띄우고 있으므로 `127.0.0.1:3000`은 반드시 추가한다.

### Email Provider

Authentication > Providers > Email

- Email provider 활성화
- MVP 로컬 테스트에서는 Confirm email을 비활성화해 회원가입 직후 바로 로그인되도록 설정한다.
- Confirm email이 켜져 있으면 Supabase가 세션 토큰을 바로 발급하지 않으므로 자동 로그인 요구사항과 충돌한다.
- 운영 배포 전에는 이메일 인증 정책을 다시 결정한다.

## DB 스키마

Supabase SQL Editor에서 `docs/supabase-schema.sql` 내용을 실행한다.

## 로컬 실행

```bash
npm run dev
```

브라우저에서 접속:

```text
http://127.0.0.1:3000/
```

회원가입 후 처음 접속한 계정은 아기 이름과 생년월일을 등록해야 홈 화면으로 진입한다.
