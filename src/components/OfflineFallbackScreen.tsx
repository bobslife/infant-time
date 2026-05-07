interface OfflineFallbackScreenProps {
  onRetry: () => void;
  onLocalPreview: () => Promise<void>;
}

export function OfflineFallbackScreen({ onRetry, onLocalPreview }: OfflineFallbackScreenProps) {
  return (
    <main className="offline-shell">
      <section className="offline-card">
        <p className="eyebrow">연결 없음</p>
        <h1>오프라인 상태입니다</h1>
        <p>
          인터넷이 연결되면 온라인 기능을 다시 사용할 수 있습니다. 지금은 로컬 미리보기로
          들어가거나 다시 시도할 수 있습니다.
        </p>
        <div className="offline-actions">
          <button className="primary-button" type="button" onClick={() => void onLocalPreview()}>
            로컬 미리보기
          </button>
          <button className="ghost-button" type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}
