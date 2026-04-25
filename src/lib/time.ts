export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeHours(lastIso: string | null, now = new Date()): string {
  if (!lastIso) {
    return "기록 없음";
  }

  const diffMs = now.getTime() - new Date(lastIso).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes}분 경과`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}시간 경과`;
  }

  return `${hours}시간 ${minutes}분 경과`;
}

export function formatRelativeSince(value: string | null, now = new Date()): string {
  if (!value) {
    return "기록 없음";
  }

  const diffMs = now.getTime() - new Date(value).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (totalMinutes < 1) {
    return "지금";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}분 전`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}시간 전`;
  }

  return `${hours}시간 ${minutes}분 전`;
}

export function isOverFourHours(lastIso: string | null, now = new Date()): boolean {
  if (!lastIso) {
    return false;
  }

  const diffMs = now.getTime() - new Date(lastIso).getTime();
  return diffMs >= 4 * 60 * 60 * 1000;
}

export function toLocalDateTimeInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainingMinutes}분`;
}

export function formatAge(birthDate: string, now = new Date()): string {
  const birth = new Date(`${birthDate}T00:00:00`);
  const diffDays = Math.max(
    0,
    Math.floor((startOfToday(now).getTime() - birth.getTime()) / 86400000),
  );

  if (diffDays < 31) {
    return `생후 ${diffDays + 1}일`;
  }

  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;

  if (days === 0) {
    return `생후 ${months}개월`;
  }

  return `생후 ${months}개월 ${days}일`;
}
