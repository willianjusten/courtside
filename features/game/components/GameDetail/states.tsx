import { strings } from "@/lib/strings";
import { SURFACE_CLASS_NAME } from "./styles";

export function GameDetailLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{strings.game.loading}</span>
      <div
        aria-hidden="true"
        className={`h-32 animate-shimmer ${SURFACE_CLASS_NAME}`}
      />
      <div
        aria-hidden="true"
        className={`h-64 animate-shimmer ${SURFACE_CLASS_NAME}`}
      />
    </div>
  );
}

type GameDetailErrorProps = {
  onRetry: () => void;
  isRetrying: boolean;
};

export function GameDetailError({ onRetry, isRetrying }: GameDetailErrorProps) {
  return (
    <div
      className={`flex flex-col items-start gap-3 p-4 ${SURFACE_CLASS_NAME}`}
    >
      <p role="alert">{strings.game.error}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-on-accent transition-colors hover:bg-accent-soft disabled:opacity-60"
      >
        {isRetrying ? strings.game.retrying : strings.game.retry}
      </button>
    </div>
  );
}

export function StaleGameNotice({ message }: { message: string }) {
  return (
    <p role="status" className="text-sm text-warning">
      {message}
    </p>
  );
}

export function GameNote({ note }: { note: string }) {
  return (
    <p className="rounded-card border border-dashed border-white/16 p-4 text-center text-sm text-muted">
      {note}
    </p>
  );
}
