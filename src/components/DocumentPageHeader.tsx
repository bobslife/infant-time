interface DocumentPageHeaderProps {
  title: string;
  dateLabel: string;
  onBack: () => void;
}

export function DocumentPageHeader({ title, dateLabel, onBack }: DocumentPageHeaderProps) {
  return (
    <header className="privacy-header">
      <button className="document-back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span>
        <span>뒤로</span>
      </button>
      <h1 className="document-title">{title}</h1>
      <p className="document-date">{dateLabel}</p>
    </header>
  );
}
