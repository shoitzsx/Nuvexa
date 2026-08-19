import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type FeedbackType = "success" | "error" | "info";

export interface FeedbackMessage {
  type: FeedbackType;
  message: string;
}

interface InlineFeedbackProps {
  feedback: FeedbackMessage | null;
  onDismiss?: () => void;
}

const feedbackStyles: Record<FeedbackType, string> = {
  success:
    "border-positive-100 bg-positive-50 text-positive-600 dark:border-positive-600/30 dark:bg-positive-600/10 dark:text-positive-100",
  error:
    "border-negative-100 bg-negative-50 text-negative-600 dark:border-negative-600/30 dark:bg-negative-600/10 dark:text-negative-100",
  info: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
};

function FeedbackIcon({ type }: { type: FeedbackType }) {
  if (type === "success") {
    return <CheckCircle2 aria-hidden="true" size={18} />;
  }

  if (type === "error") {
    return <AlertCircle aria-hidden="true" size={18} />;
  }

  return <Info aria-hidden="true" size={18} />;
}

export function InlineFeedback({ feedback, onDismiss }: InlineFeedbackProps) {
  if (!feedback) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${feedbackStyles[feedback.type]}`}
      role={feedback.type === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-2">
        <FeedbackIcon type={feedback.type} />
        <span>{feedback.message}</span>
      </div>
      {onDismiss ? (
        <button
          aria-label="Dispensar mensagem"
          className="rounded p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      ) : null}
    </div>
  );
}
