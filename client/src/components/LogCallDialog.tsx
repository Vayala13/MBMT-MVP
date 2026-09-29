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
import { cn } from "@/lib/utils";
import { CASE_STATUS_LABELS, type CallDirection } from "@shared/enums";
import type { Case, CallLogCreated } from "@shared/types";
import { FlaskConical, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

/** Anything the dialog can be pre-filled with (a case page, or a finished practice call). */
export type CallPreset = {
  caseId?: number;
  direction?: CallDirection;
  withWhom?: string;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  transcript?: string;
  /** Pre-filled from the simulated incoming call: say so on screen. */
  practice?: boolean;
};

type LogCallApi = { openLogCall: (preset?: CallPreset) => void };
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

const toLines = (text: string) =>
  text
    .split("\n")
    .map(l => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

export function LogCallProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<CallPreset>({});

  const openLogCall = useCallback((p: CallPreset = {}) => {
    setPreset(p);
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
      <LogCallDialog open={open} onOpenChange={setOpen} preset={preset} />
    </LogCallContext.Provider>
  );
}

function LogCallDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: CallPreset;
}) {
  const { data: cases } = useApi<Case[]>(open ? "/cases" : null);
  const [caseId, setCaseId] = useState<string>("");
  const [direction, setDirection] = useState<CallDirection>("in");
  const [withWhom, setWithWhom] = useState("");
  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [makeTasks, setMakeTasks] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fresh form each time it opens, filled from the preset if there is one.
  useEffect(() => {
    if (!open) return;
    setCaseId(preset.caseId ? String(preset.caseId) : "");
    setDirection(preset.direction ?? "in");
    setWithWhom(preset.withWhom ?? "");
    setSummary(preset.summary ?? "");
    setKeyPoints((preset.keyPoints ?? []).join("\n"));
    setActionItems((preset.actionItems ?? []).join("\n"));
    setMakeTasks(true);
    setTranscript(preset.transcript ?? "");
    setShowTranscript(Boolean(preset.transcript));
    setFollowUp(false);
    setError(null);
  }, [open, preset]);

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
  const actionCount = toLines(actionItems).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !withWhom.trim() || !summary.trim()) {
      setError("Pick a case and fill in who you spoke with and a summary.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api<CallLogCreated>("/call-logs", {
        method: "POST",
        body: {
          caseId: Number(caseId),
          direction,
          withWhom,
          summary,
          followUpNeeded: followUp,
          keyPoints: toLines(keyPoints),
          actionItems: toLines(actionItems),
          actionItemsToTasks: makeTasks,
          transcript: transcript.trim() || null,
        },
      });
      const made =
        saved.actionItemTaskIds.length + (saved.followUpTaskId ? 1 : 0);
      toast("Call logged", {
        description: made
          ? `${made} task${made === 1 ? "" : "s"} created for you, due next business day.`
          : undefined,
      });
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
      <DialogContent className="sm:max-w-2xl p-8 gap-6 bg-plaster max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div>
          <div className="eyebrow mb-2">Shortcut: C</div>
          <DialogTitle className="display text-4xl text-ink font-extralight">
            Log a call
          </DialogTitle>
          <DialogDescription className="font-serif italic text-lg text-smoke mt-1">
            Demo data only. No real client details.
          </DialogDescription>
        </div>

        {preset.practice && (
          <p className="stone-card status-soon text-sm text-smoke p-4 flex gap-3">
            <FlaskConical
              className="size-4 shrink-0 mt-0.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              Practice call. The transcript, key points and action items below
              are a{" "}
              <strong className="font-normal text-ink">simulated sample</strong>{" "}
              of what automatic transcription could fill in. Real transcription
              needs phone integration, which is parked for v2.
            </span>
          </p>
        )}

        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="call-case" className="eyebrow">
                Case
              </label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger
                  id="call-case"
                  className="w-full mt-2 bg-plaster"
                >
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
                      cases.find(c => String(c.id) === caseId)?.status ??
                        "active"
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
                      "btn-line cursor-pointer px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink",
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
          </div>

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
              rows={2}
              className="field resize-none"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What the call was about, in a sentence or two"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="call-keypoints" className="eyebrow">
                Key points{" "}
                <span className="normal-case tracking-normal">
                  (one per line)
                </span>
              </label>
              <textarea
                id="call-keypoints"
                rows={6}
                className="field resize-none"
                value={keyPoints}
                onChange={e => setKeyPoints(e.target.value)}
                placeholder={
                  "Client can't attend Tuesday\nNew address coming by email"
                }
              />
            </div>
            <div>
              <label htmlFor="call-actions" className="eyebrow">
                Action items{" "}
                <span className="normal-case tracking-normal">
                  (one per line)
                </span>
              </label>
              <textarea
                id="call-actions"
                rows={6}
                className="field resize-none"
                value={actionItems}
                onChange={e => setActionItems(e.target.value)}
                placeholder={
                  "Send client the upload link\nCalendar the new hearing date"
                }
              />
              <div className="flex items-center gap-2.5 mt-3">
                <Checkbox
                  id="call-maketasks"
                  checked={makeTasks}
                  onCheckedChange={v => setMakeTasks(v === true)}
                />
                <label htmlFor="call-maketasks" className="text-xs text-ink">
                  Make each action item a task
                  {actionCount > 0 && makeTasks ? ` (${actionCount})` : ""}
                </label>
              </div>
            </div>
          </div>

          <div>
            {showTranscript ? (
              <>
                <label htmlFor="call-transcript" className="eyebrow">
                  Transcript{" "}
                  <span className="normal-case tracking-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="call-transcript"
                  rows={6}
                  className="field resize-y font-light text-sm leading-relaxed"
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Paste a transcript if you have one"
                />
              </>
            ) : (
              <button
                type="button"
                className="link-quiet text-sm text-smoke"
                onClick={() => setShowTranscript(true)}
              >
                + Add a transcript (optional)
              </button>
            )}
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
