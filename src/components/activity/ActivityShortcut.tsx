import type { ReactNode } from "react";

interface ActivityShortcutProps {
  icon: string | ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  variant: "nav" | "quick";
  onClick: () => void;
}

export function ActivityShortcut({
  icon,
  label,
  badge,
  active = false,
  variant,
  onClick,
}: ActivityShortcutProps) {
  return (
    <button
      className={`activity-shortcut activity-shortcut-${variant}${active ? " active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <span className="activity-shortcut-icon" aria-hidden="true">
        {typeof icon === "string" ? <img alt="" src={icon} /> : icon}
      </span>
      <span className="activity-shortcut-label">{label}</span>
      {badge ? <span className="activity-shortcut-badge">{badge}</span> : null}
    </button>
  );
}
