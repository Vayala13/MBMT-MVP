import AppShell from "@/components/AppShell";
import { useApi } from "@/hooks/useApi";
import { NAV_ITEMS } from "@/lib/nav";
import type { Case, Deadline, Task } from "@shared/types";
import { Database } from "lucide-react";

/** Confirms the demo database is wired up until the real screens arrive. */
function DataCheck() {
  const cases = useApi<Case[]>("/cases");
  const deadlines = useApi<Deadline[]>("/deadlines");
  const tasks = useApi<Task[]>("/tasks");
  const error = cases.error ?? deadlines.error ?? tasks.error;
  if (error) {
    return (
      <p role="alert" className="text-sm text-roof">
        Demo database unavailable: {error.message}
      </p>
    );
  }
  if (!cases.data || !deadlines.data || !tasks.data) {
    return <p className="text-sm text-ash">Checking demo database…</p>;
  }
  return (
    <p className="text-sm text-smoke flex items-center gap-2">
      <Database
        className="size-4 text-ash"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      Demo database connected: {cases.data.length} cases ·{" "}
      {deadlines.data.length} deadlines · {tasks.data.length} tasks.
    </p>
  );
}

/** Stand-in for screens built in later phases. */
export default function Placeholder({ href }: { href: string }) {
  const item = NAV_ITEMS.find(n => n.href === href)!;
  return (
    <AppShell title={item.label}>
      <div className="animate-fade-in-up">
        <div className="eyebrow mb-4">Phase {item.phase}</div>
        <h1 className="display text-5xl text-ink mb-6">{item.label}</h1>
        <p className="font-serif italic text-2xl text-smoke mb-10">
          This screen arrives in Phase {item.phase}.
        </p>
        <DataCheck />
      </div>
    </AppShell>
  );
}
