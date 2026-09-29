import { useSession } from "@/lib/session";
import { ShieldAlert } from "lucide-react";

export default function Acknowledge() {
  const { acknowledge } = useSession();
  return (
    <main className="min-h-screen flex items-center pb-9">
      <div className="container max-w-3xl animate-fade-in-up">
        <div className="eyebrow mb-6">
          MBMT Case Tracker · Before you continue
        </div>
        <h1 className="display text-6xl text-ink mb-10">
          Proprietary and privileged.
        </h1>
        <div className="stone-card status-overdue p-8 mb-10 space-y-4 text-base leading-relaxed text-ink">
          <p className="flex gap-3">
            <ShieldAlert
              className="size-5 shrink-0 mt-0.5 text-roof"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              Information in this system is proprietary to the firm and may be
              protected by attorney-client privilege and the work-product
              doctrine. It must stay inside the firm.
            </span>
          </p>
          <p className="text-smoke pl-8">
            Do not copy, forward, print or screenshot it for anyone outside
            MBMT.
          </p>
          <p className="text-smoke pl-8">
            This prototype runs on invented demo data. Do not enter real client
            names or case facts.
          </p>
        </div>
        <button
          type="button"
          className="btn-solid"
          onClick={acknowledge}
          autoFocus
        >
          I acknowledge
        </button>
        <p className="font-serif italic text-xl text-smoke mt-8">
          You'll be asked once per browser session.
        </p>
      </div>
    </main>
  );
}
