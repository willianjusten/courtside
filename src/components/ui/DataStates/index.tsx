import { strings } from "@/config/strings";

type RetryableErrorProps = {
  message: string;
  detail?: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export function RetryableError({
  message,
  detail,
  onRetry,
  isRetrying,
}: RetryableErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2.5 rounded-card border border-live/28 bg-live/6 p-5 text-center"
    >
      <p className="font-bold">{message}</p>
      {detail && <p className="text-sm text-muted">{detail}</p>}
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className={`min-h-11 cursor-pointer rounded-full bg-accent px-5 text-sm font-bold text-on-accent transition-colors hover:bg-accent-soft disabled:cursor-default disabled:opacity-60 focus-ring`}
      >
        {isRetrying ? strings.common.retrying : strings.common.retry}
      </button>
    </div>
  );
}

export function StaleNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-xl border border-warning/32 bg-warning/8 px-3 py-2.5"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        className="size-4 shrink-0 text-warning"
      >
        <path d="M12 8v5M12 16.5v.5" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      <p className="grow text-sm text-warning-soft">{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-card border border-dashed border-white/16 p-5 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className="size-7 text-muted"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18" />
      </svg>
      <p className="font-bold">{message}</p>
    </div>
  );
}
