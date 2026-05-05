const effectiveDate = "2026년 5월 5일";

const collectedItems = [
  {
    title: "계정 정보",
    body: "이름, 이메일 주소, 비밀번호 인증 정보",
  },
  {
    title: "아기 프로필 정보",
    body: "아기 이름, 생년월일, 성별, 가족 공유를 위한 초대 코드",
  },
  {
    title: "돌봄 기록 정보",
    body: "수유, 수면, 소변, 대변 기록 시간, 수유량, 대변 양과 색상, 사용자가 직접 입력한 메모",
  },
  {
    title: "서비스 이용 과정에서 생성되는 정보",
    body: "계정 식별자, 기록 생성 및 수정 시각, 로그인 세션 정보",
  },
  {
    title: "계정 처리 이력",
    body: "회원가입 일시, 회원탈퇴 일시, 내부 계정 식별자",
  },
];

export function PrivacyPolicy() {
  return (
    <main className="privacy-shell">
      <article className="privacy-document">
        <header className="privacy-header">
          <a className="privacy-brand" href="/" aria-label="Infant Time 홈">
            <img src="/infant-time-log.png" alt="" />
            <span>Infant Time</span>
          </a>
          <p>시행일: {effectiveDate}</p>
          <h1>개인정보처리방침</h1>
          <p>
            Infant Time은 보호자가 아기의 수유, 수면, 배변 등 돌봄 기록을 관리할 수 있도록 서비스를
            제공합니다. 본 방침은 Infant Time이 어떤 개인정보를 수집하고, 어떻게 이용 및 보호하는지
            설명합니다.
          </p>
        </header>

        <section className="privacy-section">
          <h2>1. 수집하는 개인정보 항목</h2>
          <div className="privacy-list">
            {collectedItems.map((item) => (
              <div className="privacy-list-item" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
          <p>
            비밀번호는 인증 서비스 제공자인 Supabase의 인증 시스템을 통해 처리되며, Infant Time은
            사용자의 비밀번호 원문을 직접 조회하거나 저장하지 않습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. 개인정보의 이용 목적</h2>
          <ul>
            <li>회원가입, 로그인, 세션 유지 등 계정 기능 제공</li>
            <li>아기 프로필 생성, 수정, 조회 및 가족 공유 기능 제공</li>
            <li>수유, 수면, 소변, 대변 기록의 저장, 조회, 수정, 삭제</li>
            <li>최근 기록 요약, 일별 분석 등 앱 핵심 기능 제공</li>
            <li>서비스 안정성 유지, 오류 확인, 부정 이용 방지</li>
            <li>회원가입 및 회원탈퇴 처리 이력 관리</li>
            <li>사용자 문의 대응 및 공지 전달</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. 개인정보의 보관 및 파기</h2>
          <p>
            개인정보는 서비스 제공에 필요한 기간 동안 보관합니다. 사용자가 계정 삭제 또는 데이터 삭제를
            요청하면 관련 법령상 보관이 필요한 경우를 제외하고 지체 없이 삭제하거나 식별할 수 없는
            형태로 처리합니다.
          </p>
          <p>
            아기 프로필 및 돌봄 기록은 사용자가 직접 삭제하거나, 계정 삭제 요청이 처리될 때 함께 삭제될
            수 있습니다.
          </p>
          <p>
            회원 탈퇴 시 계정 정보, 직접 등록한 아기 프로필, 해당 프로필에 연결된 돌봄 기록, 가족 공유
            참여 정보가 삭제됩니다. 다른 보호자가 생성한 공유 프로필에 참여한 경우에는 본인의 참여 정보와
            본인이 작성한 기록이 삭제될 수 있습니다.
          </p>
          <p>
            회원가입 및 회원탈퇴 이력은 계정 처리 사실 확인, 문의 대응, 부정 이용 방지를 위해 이메일이나
            이름을 제외한 최소한의 내부 식별자와 처리 일시만 보관합니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>
            Infant Time은 사용자의 개인정보를 법령에 근거가 있거나 사용자의 별도 동의가 있는 경우를
            제외하고 제3자에게 판매하거나 제공하지 않습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. 개인정보 처리 위탁 및 외부 서비스</h2>
          <p>Infant Time은 서비스 운영을 위해 다음 외부 서비스를 사용할 수 있습니다.</p>
          <div className="privacy-list">
            <div className="privacy-list-item">
              <strong>Supabase</strong>
              <p>회원 인증, 데이터베이스 저장, 로그인 세션 관리</p>
            </div>
            <div className="privacy-list-item">
              <strong>Vercel</strong>
              <p>웹 애플리케이션 배포 및 호스팅</p>
            </div>
            <div className="privacy-list-item">
              <strong>Apple App Store</strong>
              <p>iOS 앱 배포, 앱 심사, 다운로드 및 업데이트 제공</p>
            </div>
          </div>
        </section>

        <section className="privacy-section">
          <h2>6. 사용자의 권리</h2>
          <p>사용자는 언제든지 본인의 개인정보에 대해 다음 권리를 행사할 수 있습니다.</p>
          <ul>
            <li>개인정보 열람 요청</li>
            <li>오류가 있는 개인정보의 정정 요청</li>
            <li>개인정보 삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
          </ul>
          <p>
            앱의 프로필 화면에서 회원 탈퇴를 진행할 수 있으며, 앱 내에서 직접 수정 또는 삭제할 수 없는
            정보는 아래 문의처를 통해 요청할 수 있습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. 아동의 개인정보</h2>
          <p>
            Infant Time은 보호자가 아기의 돌봄 기록을 관리하기 위한 서비스입니다. 아기에 관한 정보는
            보호자가 직접 입력한 범위에서만 처리되며, 서비스 제공 목적 외로 판매하거나 광고 추적에
            사용하지 않습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. 광고 및 추적</h2>
          <p>
            현재 Infant Time은 맞춤형 광고 제공이나 타사 광고 추적을 목적으로 개인정보를 이용하지
            않습니다. 향후 광고, 분석 도구, 푸시 알림 등 개인정보 처리 방식에 중대한 변경이 생기면 본
            방침을 개정하고 필요한 경우 별도 동의를 받겠습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. 개인정보 보호 조치</h2>
          <p>
            Infant Time은 접근 권한 제한, 인증 기반 데이터 접근, 데이터베이스 보안 정책, 전송 구간 암호화
            등 합리적인 보호 조치를 적용합니다. 다만 인터넷 기반 서비스의 특성상 모든 위험을 완전히
            제거할 수는 없습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. 문의처</h2>
          <p>
            개인정보 관련 문의, 열람, 정정, 삭제 요청은 아래 연락처로 보내주세요.
          </p>
          <dl className="privacy-contact">
            <div>
              <dt>서비스명</dt>
              <dd>Infant Time</dd>
            </div>
            <div>
              <dt>개인정보 문의</dt>
              <dd>devbob0701@gmail.com</dd>
            </div>
          </dl>
        </section>

        <section className="privacy-section">
          <h2>11. 방침 변경</h2>
          <p>
            본 개인정보처리방침은 법령, 서비스 기능, 개인정보 처리 방식 변경에 따라 개정될 수 있습니다.
            중요한 변경이 있는 경우 앱 또는 웹사이트를 통해 안내합니다.
          </p>
        </section>
      </article>
    </main>
  );
}
