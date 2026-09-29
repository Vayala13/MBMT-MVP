import { ErrorState, LoadingState } from "@/components/States";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/lib/session";
import { ROLE_LABELS } from "@shared/enums";
import type { User } from "@shared/types";
import { ArrowRight } from "lucide-react";

export default function PickUser() {
  const { pickUser } = useSession();
  const { data: users, error, loading } = useApi<User[]>("/users");

  return (
    <main className="min-h-screen flex items-center pb-9">
      <div className="container max-w-3xl animate-fade-in-up">
        <div className="eyebrow mb-6">MBMT Case Tracker · Sign in</div>
        <h1 className="display text-6xl text-ink mb-4">Who's working?</h1>
        <p className="font-serif italic text-2xl text-smoke mb-12">
          Pick yourself. Your name goes on everything you change.
        </p>

        {loading && !error && <LoadingState what="the team" />}
        {error && <ErrorState what="the team" error={error} />}

        {users && (
          <ul className="max-w-xl flex flex-col gap-px bg-sand border border-sand">
            {users.map(u => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => pickUser(u)}
                  className="group hover-row w-full stone-card hover:bg-[#e8e2d7] text-left p-5 flex items-center gap-4"
                >
                  <span
                    aria-hidden="true"
                    className="size-11 shrink-0 bg-navy text-plaster flex items-center justify-center text-xs tracking-[0.12em] transition-colors duration-300 group-hover:bg-[#2f6e6b]"
                  >
                    {u.initials}
                  </span>
                  <span className="flex-1">
                    <span className="block text-ink">{u.name}</span>
                    <span className="block text-xs text-ash mt-0.5">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 text-ash transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-ash mt-8">
          No passwords in the prototype. Real sign-in is decided after the pilot
          with IT.
        </p>
      </div>
    </main>
  );
}
