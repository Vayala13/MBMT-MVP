import DeadlineDateDialog from "@/components/DeadlineDateDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDay } from "@/lib/format";
import { ROLE_LABELS } from "@shared/enums";
import type { Deadline, Task, User } from "@shared/types";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

const UNASSIGNED = "none";

/**
 * Delegation: reassign a task or deadline and set its own due date.
 * Deadline dates go through the reason dialog (writes the change history).
 */
export default function DelegateControls({
  kind,
  item,
  users,
}: {
  kind: "task" | "deadline";
  item: Task | Deadline;
  users: User[];
}) {
  const uid = useId();
  const [due, setDue] = useState(item.dueDate ?? "");
  const [moving, setMoving] = useState<Deadline | null>(null);
  useEffect(() => setDue(item.dueDate ?? ""), [item.dueDate]);

  const patch = async (body: Record<string, unknown>, done: string) => {
    try {
      await api(`/${kind === "task" ? "tasks" : "deadlines"}/${item.id}`, {
        method: "PATCH",
        body,
      });
      toast(done, { description: item.title });
      announceDataChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not save the change."
      );
    }
  };

  const reassign = (v: string) => {
    const to = v === UNASSIGNED ? null : Number(v);
    const name = to ? users.find(u => u.id === to)?.name : "nobody";
    patch({ assignedTo: to }, `Reassigned to ${name}`);
  };

  return (
    <div className="grid grid-cols-2 gap-5 pt-2">
      <div>
        <label htmlFor={`${uid}-who`} className="eyebrow">
          Assigned to
        </label>
        <Select
          value={item.assignedTo ? String(item.assignedTo) : UNASSIGNED}
          onValueChange={reassign}
        >
          <SelectTrigger id={`${uid}-who`} className="w-full mt-2 bg-plaster">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name} · {ROLE_LABELS[u.role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor={`${uid}-due`} className="eyebrow">
          Due date
        </label>
        {kind === "task" ? (
          <div className="flex items-end gap-3">
            <input
              id={`${uid}-due`}
              type="date"
              className="field py-2"
              value={due}
              onChange={e => setDue(e.target.value)}
            />
            {due !== (item.dueDate ?? "") && (
              <button
                type="button"
                className="link-quiet text-sm text-ink pb-2 whitespace-nowrap"
                onClick={() =>
                  patch(
                    { dueDate: due || null },
                    due ? `Due ${fmtDay(due)}` : "Due date cleared"
                  )
                }
              >
                Save date
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3 border-b border-[#8f897f] py-2">
            <span id={`${uid}-due`} className="text-sm text-ink">
              {fmtDay(item.dueDate!)}
            </span>
            <button
              type="button"
              className="link-quiet text-sm text-ink"
              onClick={() => setMoving(item as Deadline)}
            >
              Change date
            </button>
          </div>
        )}
      </div>
      {kind === "deadline" && (
        <DeadlineDateDialog
          deadline={moving}
          onOpenChange={o => !o && setMoving(null)}
        />
      )}
    </div>
  );
}
