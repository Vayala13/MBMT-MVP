import { cn } from "@/lib/utils";
import type { Metrics } from "@shared/dashboard";
import { AlertTriangle } from "lucide-react";

export default function MetricRow({ m }: { m: Metrics }) {
  const cards = [
    { label: "Total cases", value: m.totalCases },
    { label: "Active cases", value: m.activeCases },
    {
      label: "Overdue tasks",
      value: m.overdueTasks,
      alert: m.overdueTasks > 0,
    },
    { label: "Open tasks", value: m.openTasks },
  ];
  return (
    <section
      aria-label="Key numbers"
      className="grid grid-cols-4 gap-px bg-sand border border-sand"
    >
      {cards.map(c => (
        <div
          key={c.label}
          className={cn("stone-card px-6 py-5", c.alert && "status-overdue")}
        >
          <div className="eyebrow mb-3 flex items-center gap-2">
            {c.alert && (
              <AlertTriangle
                className="size-3.5 text-roof"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
            {c.label}
          </div>
          <div
            className={cn(
              "display text-5xl tabular-nums",
              c.alert ? "text-roof" : "text-ink"
            )}
          >
            {c.value}
          </div>
        </div>
      ))}
    </section>
  );
}
