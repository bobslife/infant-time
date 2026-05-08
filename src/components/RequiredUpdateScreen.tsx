import { MIN_SUPPORTED_APP_VERSION } from "../lib/appUpdate";

interface RequiredUpdateScreenProps {
  currentVersion: string | null;
  updateUrl: string;
}

export function RequiredUpdateScreen({ currentVersion, updateUrl }: RequiredUpdateScreenProps) {
  return (
    <main className="update-shell" aria-label="앱 업데이트 필요">
      <section className="update-card">
        <img className="update-logo" src="/infant-time-logo.png" alt="Infant Time" />
        <div className="update-copy">
          <span>업데이트 필요</span>
          <h1>새 버전으로 업데이트해 주세요</h1>
          <p>
            안정적인 기록 저장과 최신 기능 사용을 위해 현재 버전에서는 앱을 계속 사용할 수 없습니다.
          </p>
        </div>
        <dl className="update-version-list">
          <div>
            <dt>현재 버전</dt>
            <dd>{currentVersion ?? "확인 중"}</dd>
          </div>
          <div>
            <dt>필요 버전</dt>
            <dd>{MIN_SUPPORTED_APP_VERSION} 이상</dd>
          </div>
        </dl>
        <a className="primary-button update-button" href={updateUrl}>
          업데이트하기
        </a>
      </section>
    </main>
  );
}
