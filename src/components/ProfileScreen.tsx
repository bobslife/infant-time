import { FormEvent, useState } from "react";
import { AppUser, BabyProfile, JoinBabyInput } from "../types";
import { formatAge, formatDateTime } from "../lib/time";

interface ProfileScreenProps {
  baby: BabyProfile;
  babies: BabyProfile[];
  user: AppUser;
  onCreateBaby: (input: { name: string; birthDate: string }) => Promise<void>;
  onJoinBaby: (input: JoinBabyInput) => Promise<void>;
  onSelectBaby: (babyId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ProfileScreen({
  baby,
  babies,
  user,
  onCreateBaby,
  onJoinBaby,
  onSelectBaby,
  onSignOut,
}: ProfileScreenProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [addMode, setAddMode] = useState<"closed" | "create" | "join">("closed");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(new Date().toISOString().slice(0, 10));
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleInviteCodeChange(value: string) {
    setInviteCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase());
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateBaby({ name: name.trim(), birthDate });
      setName("");
      setAddMode("closed");
      setIsPickerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onJoinBaby({ inviteCode });
      setInviteCode("");
      setAddMode("closed");
      setIsPickerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectBaby(babyId: string) {
    await onSelectBaby(babyId);
    setIsPickerOpen(false);
    setAddMode("closed");
  }

  return (
    <section className="screen-stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">아기 프로필</p>
            <h2>{baby.name}</h2>
          </div>
          <button className="ghost-button compact-button" type="button" onClick={() => setIsPickerOpen(true)}>
            변경하기
          </button>
        </div>
        <div className="profile-list">
          <div>
            <span>생일</span>
            <strong>{baby.birthDate}</strong>
          </div>
          <div>
            <span>생후</span>
            <strong>{formatAge(baby.birthDate)}</strong>
          </div>
          <div>
            <span>등록일</span>
            <strong>{formatDateTime(baby.createdAt)}</strong>
          </div>
          <div>
            <span>초대 코드</span>
            <strong>{baby.inviteCode}</strong>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="profile-list">
          <div>
            <span>보호자 이름</span>
            <strong>{user.name ?? "이름 정보 없음"}</strong>
          </div>
          <div>
            <span>로그인 계정</span>
            <strong>{user.email ?? "계정 정보 없음"}</strong>
          </div>
          <div>
            <span>저장 방식</span>
            <strong>{user.isLocal ? "로컬 미리보기" : "Supabase"}</strong>
          </div>
        </div>
        <button className="ghost-button full-width" type="button" onClick={onSignOut}>
          로그아웃
        </button>
      </section>
      {isPickerOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPickerOpen(false)}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="아기 변경"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">아기 변경</p>
                <h2>아이 목록</h2>
              </div>
              <button className="ghost-button compact-button" type="button" onClick={() => setIsPickerOpen(false)}>
                닫기
              </button>
            </div>
            <div className="baby-picker-list">
              {babies.map((item) => (
                <button
                  className={item.id === baby.id ? "active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => void handleSelectBaby(item.id)}
                >
                  <span>{item.name}</span>
                  <strong>{item.inviteCode}</strong>
                </button>
              ))}
            </div>
            <button
              className="primary-button full-width"
              type="button"
              onClick={() => setAddMode(addMode === "closed" ? "create" : "closed")}
            >
              아기 추가
            </button>
            {addMode !== "closed" ? (
              <div className="modal-add-panel">
                <div className="auth-switch" role="tablist" aria-label="아기 추가 방식">
                  <button
                    className={addMode === "create" ? "active" : ""}
                    type="button"
                    onClick={() => setAddMode("create")}
                  >
                    직접 등록
                  </button>
                  <button
                    className={addMode === "join" ? "active" : ""}
                    type="button"
                    onClick={() => setAddMode("join")}
                  >
                    코드 입력
                  </button>
                </div>
                {addMode === "create" ? (
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
                    <button
                      className="primary-button"
                      disabled={isSubmitting || !name.trim()}
                      type="submit"
                    >
                      {isSubmitting ? "저장 중..." : "아기 추가"}
                    </button>
                  </form>
                ) : (
                  <form className="entry-form" onSubmit={handleJoin}>
                    <label className="field">
                      <span>아기 코드</span>
                      <input
                        required
                        maxLength={8}
                        value={inviteCode}
                        onChange={(event) => handleInviteCodeChange(event.target.value)}
                        placeholder="8자리 초대 코드"
                      />
                    </label>
                    <button
                      className="primary-button"
                      disabled={isSubmitting || inviteCode.length !== 8}
                      type="submit"
                    >
                      {isSubmitting ? "등록 중..." : "코드 등록"}
                    </button>
                  </form>
                )}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
