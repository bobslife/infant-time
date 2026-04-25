import { AppUser, BabyProfile } from "../types";
import { formatAge, formatDateTime } from "../lib/time";

interface ProfileScreenProps {
  baby: BabyProfile;
  user: AppUser;
  onSignOut: () => Promise<void>;
}

export function ProfileScreen({ baby, user, onSignOut }: ProfileScreenProps) {
  return (
    <section className="screen-stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">아기 프로필</p>
            <h2>{baby.name}</h2>
          </div>
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
    </section>
  );
}
