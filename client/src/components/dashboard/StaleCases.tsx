import StatusBadge from "@/components/StatusBadge";
import { fmtDate, timeAgo } from "@/lib/format";
import type { Case, User } from "@shared/types";
import { Hourglass } from "lucide-react";
import type { DrawerItem } from "./types";

export default function StaleCases({
  cases,
  userById,
  onOpen,
}: {
  cases: Case[];
  userById: Map<number, User>;
  onOpen: (item: DrawerItem) => void;
}) {
  return (
    <section aria-labelledby="stale-title">
      <div className="eyebrow mb-2 flex items-center gap-2">
        <Hourglass className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        Stale cases warning
      </div>
      <h2 id="stale-title" className="display text-3xl text-ink mb-5">
        {cases.length === 0
          ? "Nothing stale"
          : `${cases.length} untouched for over a year`}
      </h2>
      {cases.length === 0 ? (
        <p className="font-serif italic text-xl text-smoke">
          Every active case has been touched this year.
        </p>
      ) : (
        <ul className="border-t border-sand">
          {cases.map(c => {
            const who = c.lastTouchedBy
              ? userById.get(c.lastTouchedBy)?.name
              : undefined;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "case",
                      id: c.id,
                      caseId: c.id,
                      title: c.caption,
                    })
                  }
                  className="data-row status-stale w-full text-left pl-4 pr-3 py-3 flex items-start justify-between gap-3 transition-colors duration-300"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">{c.caption}</div>
                    <div className="text-xs text-ash mt-0.5">
                      Last touched by {who ?? "unknown"} on{" "}
                      {fmtDate(c.lastTouchedAt)}
                    </div>
                    <div className="text-xs text-ash">
                      {timeAgo(c.lastTouchedAt)}
                    </div>
                  </div>
                  <StatusBadge status="stale" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
