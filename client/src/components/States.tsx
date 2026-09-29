import { announceDataChanged } from "@/lib/dataEvents";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Loading, error and empty states used on every screen. */

export function LoadingState({ what }: { what: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-sm text-ash animate-pulse"
    >
      Loading {what}…
    </p>
  );
}

/** Turns a raw fetch error into something a paralegal can act on. */
export function friendlyError(error: Error): string {
  if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
    return "The app's server isn't responding. Check that the Terminal running pnpm dev is still open.";
  }
  if (/pick a user/i.test(error.message))
    return "Your session ended. Switch user and pick your name again.";
  return error.message;
}

export function ErrorState({ what, error }: { what: string; error: Error }) {
  return (
    <div
      role="alert"
      className="stone-card status-overdue p-5 flex items-start gap-3 max-w-2xl"
    >
      <AlertTriangle
        className="size-4 mt-0.5 shrink-0 text-roof"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="text-ink">Couldn't load {what}.</p>
        <p className="text-smoke mt-1">{friendlyError(error)}</p>
        <button
          type="button"
          onClick={announceDataChanged}
          className="btn-line mt-4 py-2.5 px-4"
        >
          <RotateCcw
            className="size-3.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Try again
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="font-serif italic text-xl text-smoke">{children}</p>;
}
