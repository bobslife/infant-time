import { FormEvent, useState } from "react";
import { CreateBabyInput } from "../types";

interface BabySetupProps {
  errorMessage: string | null;
  onSubmit: (input: CreateBabyInput) => Promise<void>;
}

export function BabySetup({ errorMessage, onSubmit }: BabySetupProps) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), birthDate });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">처음 설정</p>
        <h1>아기 정보를 등록해 주세요</h1>
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>아기 이름</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 사랑이"
            />
          </label>
          <label className="field">
            <span>생일</span>
            <input
              required
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting || !name.trim()} type="submit">
            {isSubmitting ? "저장 중..." : "저장하고 시작"}
          </button>
        </form>
      </section>
    </main>
  );
}
