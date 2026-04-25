import { FormEvent, useState } from "react";
import { SignInInput, SignUpInput } from "../types";

interface LoginScreenProps {
  hasSupabase: boolean;
  errorMessage: string | null;
  onSignUp: (input: SignUpInput) => Promise<void>;
  onSignIn: (input: SignInInput) => Promise<void>;
  onLocalPreview: () => Promise<void>;
}

type AuthMode = "signIn" | "signUp";

export function LoginScreen({
  hasSupabase,
  errorMessage,
  onSignUp,
  onSignIn,
  onLocalPreview,
}: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (mode === "signUp" && password !== passwordConfirm) {
      setLocalError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signUp") {
        await onSignUp({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await onSignIn({
          email: email.trim(),
          password,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <img className="auth-logo" src="/infant-time-logo.png" alt="Infant Time" />
      <section className="auth-panel">
        <div className="auth-switch" role="tablist" aria-label="인증 방식">
          <button
            className={mode === "signIn" ? "active" : ""}
            type="button"
            onClick={() => setMode("signIn")}
          >
            로그인
          </button>
          <button
            className={mode === "signUp" ? "active" : ""}
            type="button"
            onClick={() => setMode("signUp")}
          >
            회원가입
          </button>
        </div>

        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        {localError ? <p className="error-copy">{localError}</p> : null}

        <form className="entry-form" onSubmit={handleSubmit}>
          {mode === "signUp" ? (
            <label className="field">
              <span>이름</span>
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="보호자 이름"
              />
            </label>
          ) : null}

          <label className="field">
            <span>이메일</span>
            <input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </label>

          <label className="field">
            <span>비밀번호</span>
            <input
              required
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6자 이상"
            />
          </label>

          {mode === "signUp" ? (
            <label className="field">
              <span>비밀번호 확인</span>
              <input
                required
                autoComplete="new-password"
                minLength={6}
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="비밀번호 재입력"
              />
            </label>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "처리 중..." : mode === "signUp" ? "회원가입" : "로그인"}
          </button>
        </form>

        {!hasSupabase ? (
          <button className="ghost-button" type="button" onClick={onLocalPreview}>
            로컬 미리보기로 확인
          </button>
        ) : null}
        <footer className="auth-footer">Infant Time</footer>
      </section>
    </main>
  );
}
