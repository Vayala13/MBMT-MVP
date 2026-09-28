import { STATUS_LABELS, type Status } from "@shared/status";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_ICONS: Record<Status, LucideIcon> = {
  overdue: AlertTriangle,
  soon: Clock,
  ok: CheckCircle2,
  stale: Hourglass,
};

/** Text label + icon + color. Never color alone. */
export default function StatusBadge({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={cn("badge", `badge-${status}`, className)}>
      <Icon className="size-3" strokeWidth={1.75} aria-hidden="true" />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
