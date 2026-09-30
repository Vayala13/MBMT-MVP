import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { weekendWarning } from "@shared/dates";
import { fmtDay } from "@/lib/format";
import { DEADLINE_CHANGE_REASONS } from "@shared/enums";
import type { Deadline } from "@shared/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Moving a deadline always asks why; the server writes deadline_changes. */
export default function DeadlineDateDialog({
  deadline,
  onOpenChange,
}: {
  deadline: Deadline | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    setDate(deadline.dueDate);
    setReason("");
    setOther("");
    setError(null);
  }, [deadline]);

  useEffect(() => setError(null), [date, reason, other]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) return;
    if (!date || date === deadline.dueDate) return setError("Pick a new date.");
    if (!reason) return setError("Pick a reason for the change.");
    if (reason === "Other" && !other.trim())
      return setError("Say briefly why the date moved.");
    setSaving(true);
    setError(null);
    try {
      await api(`/deadlines/${deadline.id}`, {
        method: "PATCH",
        body: {
          dueDate: date,
          changeReason: reason === "Other" ? `Other: ${other.trim()}` : reason,
        },
      });
      toast("Deadline moved", {
        description: `${deadline.title} → ${fmtDay(date)}`,
      });
      announceDataChanged();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not move the deadline."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={deadline !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-8 gap-6 bg-plaster">
        <div>
          <div className="eyebrow mb-2">Change deadline date</div>
          <DialogTitle className="display text-3xl text-ink font-extralight">
            {deadline?.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-smoke mt-2">
            Currently due {deadline ? fmtDay(deadline.dueDate) : ""}. The old
            date and reason are kept in the history.
          </DialogDescription>
        </div>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="dl-date" className="eyebrow">
              New due date
            </label>
            <input
              id="dl-date"
              type="date"
              className="field"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            {weekendWarning(date) && (
              <p className="text-xs text-[#7c5f1c] mt-1.5" role="note">
                {weekendWarning(date)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="dl-reason" className="eyebrow">
              Reason
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="dl-reason" className="w-full mt-2 bg-plaster">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_CHANGE_REASONS.map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === "Other" && (
            <div>
              <label htmlFor="dl-other" className="eyebrow">
                What happened?
              </label>
              <input
                id="dl-other"
                className="field"
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder="e.g. hearing reset by the court clerk"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-roof">
              {error}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button type="submit" className="btn-solid" disabled={saving}>
              {saving ? "Saving…" : "Move deadline"}
            </button>
            <button
              type="button"
              className="btn-line"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
