import { FormEvent, useState } from "react";
import { BabyGender, CreateBabyInput, JoinBabyInput } from "../types";

const genderOptions: Array<{ value: BabyGender; label: string; icon: string }> = [
  { value: "girl", label: "여아", icon: "/icons/girl.svg" },
  { value: "boy", label: "남아", icon: "/icons/boy.svg" },
];

interface BabySetupProps {
  errorMessage: string | null;
  onSubmit: (input: CreateBabyInput) => Promise<void>;
  onJoin: (input: JoinBabyInput) => Promise<void>;
}

export function BabySetup({ errorMessage, onSubmit, onJoin }: BabySetupProps) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(new Date().toISOString().slice(0, 10));
  const [gender, setGender] = useState<BabyGender>("girl");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleInviteCodeChange(value: string) {
    setInviteCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase());
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), birthDate, gender });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onJoin({ inviteCode: inviteCode.trim() });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">처음 설정</p>
        <h1>아기를 등록해 주세요</h1>
        <div className="auth-switch" role="tablist" aria-label="아기 등록 방식">
          <button
            className={mode === "join" ? "active" : ""}
            type="button"
            onClick={() => setMode("join")}
          >
            코드 등록
          </button>
          <button
            className={mode === "create" ? "active" : ""}
            type="button"
            onClick={() => setMode("create")}
          >
            새 아기 추가
          </button>
        </div>
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        {mode === "join" ? (
          <form className="entry-form" onSubmit={handleJoin}>
            <label className="field">
              <span>아기 코드</span>
              <input
                required
                maxLength={8}
                value={inviteCode}
                onChange={(event) => handleInviteCodeChange(event.target.value)}
                placeholder="초대 코드를 입력해 주세요"
              />
            </label>
            <button
              className="primary-button"
              disabled={isSubmitting || inviteCode.length !== 8}
              type="submit"
            >
              {isSubmitting ? "등록 중..." : "코드 등록하고 시작"}
            </button>
          </form>
        ) : (
          <form className="entry-form" onSubmit={handleCreate}>
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
            <div className="field">
              <span>성별</span>
              <div className="gender-switch" role="radiogroup" aria-label="아기 성별">
                {genderOptions.map((option) => (
                  <button
                    className={`gender-${option.value}${gender === option.value ? " active" : ""}`}
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={gender === option.value}
                    onClick={() => setGender(option.value)}
                  >
                    <img alt="" aria-hidden="true" src={option.icon} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="primary-button"
              disabled={isSubmitting || !name.trim()}
              type="submit"
            >
              {isSubmitting ? "저장 중..." : "저장하고 시작"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
