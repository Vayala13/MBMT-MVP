import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CASE_STATUS_LABELS, type CallDirection } from "@shared/enums";
import type { Case, CallLog, Task } from "@shared/types";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type LogCallApi = { openLogCall: (caseId?: number) => void };
const LogCallContext = createContext<LogCallApi | null>(null);

export function useLogCall(): LogCallApi {
  const ctx = useContext(LogCallContext);
  if (!ctx) throw new Error("useLogCall must be used inside <LogCallProvider>");
  return ctx;
}

/** True when the keypress is going into a form field, so "C" should type a letter. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.getAttribute("role") === "combobox" ||
    el.closest("[role=dialog]") !== null
  );
}

export function LogCallProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [presetCaseId, setPresetCaseId] = useState<number | undefined>();

  const openLogCall = useCallback((caseId?: number) => {
    setPresetCaseId(caseId);
    setOpen(true);
  }, []);

  // Keyboard shortcut: C opens "Log a call" from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "c" || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      openLogCall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLogCall]);

  return (
    <LogCallContext.Provider value={{ openLogCall }}>
      {children}
      <LogCallDialog
        open={open}
        onOpenChange={setOpen}
        presetCaseId={presetCaseId}
      />
    </LogCallContext.Provider>
  );
}

function LogCallDialog({
  open,
  onOpenChange,
  presetCaseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCaseId?: number;
}) {
  const { data: cases } = useApi<Case[]>(open ? "/cases" : null);
  const [caseId, setCaseId] = useState<string>("");
  const [direction, setDirection] = useState<CallDirection>("in");
  const [withWhom, setWithWhom] = useState("");
  const [summary, setSummary] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fresh form each time it opens; keep the case if one was passed in.
  useEffect(() => {
    if (!open) return;
    setCaseId(presetCaseId ? String(presetCaseId) : "");
    setDirection("in");
    setWithWhom("");
    setSummary("");
    setFollowUp(false);
    setError(null);
  }, [open, presetCaseId]);

  // Clear an old "fill this in" message as soon as the form changes.
  useEffect(() => setError(null), [caseId, withWhom, summary]);

  const openCases = (cases ?? [])
    .filter(c => c.status !== "closed")
    .sort((a, b) => a.caption.localeCompare(b.caption));
  const groups = [
    { label: "Active", rows: openCases.filter(c => c.status === "active") },
    {
      label: "Intake",
      rows: openCases.filter(
        c => c.status === "inquiry" || c.status === "consult"
      ),
    },
    {
      label: "Referred out",
      rows: openCases.filter(c => c.status === "referred_out"),
    },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !withWhom.trim() || !summary.trim()) {
      setError("Pick a case and fill in who you spoke with and a summary.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api<CallLog & { followUpTaskId: number | null }>(
        "/call-logs",
        {
          method: "POST",
          body: {
            caseId: Number(caseId),
            direction,
            withWhom,
            summary,
            followUpNeeded: followUp,
          },
        }
      );
      if (saved.followUpTaskId) {
        const task = await api<Task>(`/tasks/${saved.followUpTaskId}`);
        toast("Call logged", {
          description: `Follow-up task created, due ${task.dueDate ? fmtDay(task.dueDate) : "soon"}.`,
        });
      } else {
        toast("Call logged");
      }
      announceDataChanged();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the call."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-8 gap-6 bg-plaster">
        <div>
          <div className="eyebrow mb-2">Shortcut: C</div>
          <DialogTitle className="display text-4xl text-ink font-extralight">
            Log a call
          </DialogTitle>
          <DialogDescription className="font-serif italic text-lg text-smoke mt-1">
            Demo data only. No real client details.
          </DialogDescription>
        </div>

        <form onSubmit={submit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="call-case" className="eyebrow">
              Case
            </label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger id="call-case" className="w-full mt-2 bg-plaster">
                <SelectValue placeholder="Choose a case" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {groups
                  .filter(g => g.rows.length)
                  .map(g => (
                    <SelectGroup key={g.label}>
                      <SelectLabel className="eyebrow">{g.label}</SelectLabel>
                      {g.rows.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.caption}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
            {caseId && cases && (
              <p className="text-xs text-ash mt-1">
                {
                  CASE_STATUS_LABELS[
                    cases.find(c => String(c.id) === caseId)?.status ?? "active"
                  ]
                }
              </p>
            )}
          </div>

          <fieldset>
            <legend className="eyebrow mb-2">Direction</legend>
            <div className="flex gap-2">
              {(
                [
                  ["in", "Incoming", PhoneIncoming],
                  ["out", "Outgoing", PhoneOutgoing],
                ] as const
              ).map(([value, label, Icon]) => (
                <label
                  key={value}
                  className={cn(
                    "btn-line cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink",
                    direction === value &&
                      "bg-navy text-plaster border-navy hover:border-navy"
                  )}
                >
                  <input
                    type="radio"
                    name="call-direction"
                    value={value}
                    checked={direction === value}
                    onChange={() => setDirection(value)}
                    className="sr-only"
                  />
                  <Icon
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="call-with" className="eyebrow">
              Spoke with
            </label>
            <input
              id="call-with"
              className="field"
              value={withWhom}
              onChange={e => setWithWhom(e.target.value)}
              placeholder="e.g. client, opposing counsel, court clerk"
            />
          </div>

          <div>
            <label htmlFor="call-summary" className="eyebrow">
              Summary
            </label>
            <textarea
              id="call-summary"
              rows={3}
              className="field resize-none"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What was discussed"
            />
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="call-follow"
              checked={followUp}
              onCheckedChange={v => setFollowUp(v === true)}
            />
            <label htmlFor="call-follow" className="text-sm text-ink">
              Follow-up needed{" "}
              <span className="text-ash">
                (creates a task for you, due next business day)
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-roof">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button type="submit" className="btn-solid" disabled={saving}>
              {saving ? "Saving…" : "Save call"}
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
