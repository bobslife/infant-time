import { useState } from "react";

export interface FeedbackAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface AppFeedback {
  id: string;
  message: string;
  tone: "success" | "error" | "neutral";
  primaryAction?: FeedbackAction;
  secondaryAction?: FeedbackAction;
  expiresInMs?: number;
}

interface AppFeedbackSnackbarProps {
  feedback: AppFeedback;
  onDismiss: () => void;
}

export function AppFeedbackSnackbar({ feedback, onDismiss }: AppFeedbackSnackbarProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const primaryAction = feedback.primaryAction;
  const secondaryAction = feedback.secondaryAction;

  async function runAction(action: FeedbackAction) {
    if (busyAction) {
      return;
    }

    setBusyAction(action.label);
    try {
      await action.onClick();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section
      aria-atomic="true"
      aria-live={feedback.tone === "error" ? "assertive" : "polite"}
      className={`app-feedback app-feedback-${feedback.tone}`}
      role="status"
    >
      <p>{feedback.message}</p>
      <div className="app-feedback-actions">
        {primaryAction ? (
          <button
            disabled={Boolean(busyAction)}
            type="button"
            onClick={() => void runAction(primaryAction)}
          >
            {busyAction === primaryAction.label ? "처리 중…" : primaryAction.label}
          </button>
        ) : null}
        {secondaryAction ? (
          <button
            disabled={Boolean(busyAction)}
            type="button"
            onClick={() => void runAction(secondaryAction)}
          >
            {busyAction === secondaryAction.label ? "처리 중…" : secondaryAction.label}
          </button>
        ) : null}
        <button aria-label="알림 닫기" className="app-feedback-dismiss" type="button" onClick={onDismiss}>
          닫기
        </button>
      </div>
    </section>
  );
}
