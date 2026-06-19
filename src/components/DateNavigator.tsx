interface DateNavigatorProps {
  ariaLabel: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toLocalDateKey(new Date(year, month - 1, day + amount));
}

export function DateNavigator({ ariaLabel, selectedDate, onDateChange }: DateNavigatorProps) {
  const todayKey = toLocalDateKey(new Date());
  const isToday = selectedDate === todayKey;
  const canMoveNext = selectedDate < todayKey;

  return (
    <div className="date-navigator" aria-label={ariaLabel}>
      <div className="date-navigator-main">
        <button
          aria-label="이전 날"
          className="date-navigator-arrow"
          type="button"
          onClick={() => onDateChange(moveDate(selectedDate, -1))}
        >
          ‹
        </button>
        <label className="date-navigator-picker">
          <span className="sr-only">날짜 직접 선택</span>
          <input
            aria-label={`${ariaLabel} 직접 선택`}
            max={todayKey}
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (event.target.value) {
                onDateChange(event.target.value);
              }
            }}
          />
        </label>
        <button
          aria-label="다음 날"
          className="date-navigator-arrow"
          disabled={!canMoveNext}
          type="button"
          onClick={() => {
            const nextDate = moveDate(selectedDate, 1);
            onDateChange(nextDate > todayKey ? todayKey : nextDate);
          }}
        >
          ›
        </button>
      </div>
      {!isToday ? (
        <button className="date-navigator-today" type="button" onClick={() => onDateChange(todayKey)}>
          오늘
        </button>
      ) : null}
    </div>
  );
}
