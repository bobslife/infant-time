import { DocumentPageHeader } from "./DocumentPageHeader";

const effectiveDate = "2026년 5월 6일";

const supportTopics = [
  "로그인 및 계정 접근",
  "기록 저장/수정/삭제 문제",
  "동기화 또는 표시 오류",
  "기능 문의 및 개선 제안",
];

function handleBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "/";
}

export function SupportPage() {
  return (
    <main className="privacy-shell">
      <article className="privacy-document">
        <DocumentPageHeader title="고객 지원 안내" dateLabel={`시행일: ${effectiveDate}`} onBack={handleBack} />
        <p className="privacy-intro">
          Infant Time은 아기의 수유, 수면, 기저귀, 약 복용, 체온, 이유식 기록을 관리하는 서비스입니다.
          앱 사용 중 문제가 발생하거나 도움이 필요하시면 아래 연락처로 문의해 주세요.
        </p>

        <section className="privacy-section">
          <h2>문의 가능한 내용</h2>
          <div className="privacy-list">
            {supportTopics.map((topic) => (
              <div className="privacy-list-item" key={topic}>
                <strong>{topic}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="privacy-section">
          <h2>연락처</h2>
          <dl className="privacy-contact">
            <div>
              <dt>담당자</dt>
              <dd>Chanmin Park</dd>
            </div>
            <div>
              <dt>전화번호</dt>
              <dd>+82-10-7332-2348</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>devbob0701@gmail.com</dd>
            </div>
          </dl>
          <p>
            가능하면 이메일로 문의해 주세요. 사용 중인 기기, 발생한 화면, 오류 메시지를 함께 보내주시면
            더 빠르게 확인할 수 있습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>추가 안내</h2>
          <p>
            개인정보 관련 요청은 개인정보처리방침 페이지를 통해 확인하실 수 있습니다.
          </p>
        </section>
      </article>
    </main>
  );
}
