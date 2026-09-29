import CaseSelect from "@/components/CaseSelect";
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
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { weekendWarning } from "@shared/dates";
import { fmtDay } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useShortcut } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { toDate } from "@shared/dashboard";
import { ROLE_LABELS } from "@shared/enums";
import { planFromTemplate } from "@shared/templates";
import type { Case, Task, TaskTemplate, User } from "@shared/types";
import { format, subDays } from "date-fns";
import { CornerDownRight } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

export type NewTaskPreset = { caseId?: number; templateId?: number };

type NewTaskApi = { openNewTask: (preset?: NewTaskPreset) => void };
const NewTaskContext = createContext<NewTaskApi | null>(null);

export function useNewTask(): NewTaskApi {
  const ctx = useContext(NewTaskContext);
  if (!ctx) throw new Error("useNewTask must be used inside <NewTaskProvider>");
  return ctx;
}

export function NewTaskProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<NewTaskPreset>({});
  const openNewTask = useCallback((p: NewTaskPreset = {}) => {
    setPreset(p);
    setOpen(true);
  }, []);
  // Keyboard shortcut: N opens "New task" from anywhere.
  useShortcut("n", () => openNewTask());
  return (
    <NewTaskContext.Provider value={{ openNewTask }}>
      {children}
      <NewTaskDialog open={open} onOpenChange={setOpen} preset={preset} />
    </NewTaskContext.Provider>
  );
}

const BLANK = "blank";

function NewTaskDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: NewTaskPreset;
}) {
  const { user } = useSession();
  const { data: cases } = useApi<Case[]>(open ? "/cases" : null);
  const { data: templates } = useApi<TaskTemplate[]>(
    open ? "/templates" : null
  );
  const { data: users } = useApi<User[]>(open ? "/users" : null);

  const [caseId, setCaseId] = useState("");
  const [templateId, setTemplateId] = useState(BLANK);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCaseId(preset.caseId ? String(preset.caseId) : "");
    setTemplateId(preset.templateId ? String(preset.templateId) : BLANK);
    setTitle("");
    setDueDate("");
    setAssignee(user ? String(user.id) : "");
    setPriority(preset.templateId ? 1 : 2);
    setError(null);
  }, [open, preset, user]);

  useEffect(() => setError(null), [caseId, templateId, title, dueDate]);

  const template =
    templateId === BLANK
      ? undefined
      : templates?.find(t => String(t.id) === templateId);
  const plan =
    template && dueDate ? planFromTemplate(template.subtasks, dueDate) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return setError("Pick a case.");
    if (!template && !title.trim()) return setError("Give the task a title.");
    if (template && !dueDate)
      return setError(
        "A template needs a due date to work out the subtask dates."
      );
    setSaving(true);
    try {
      const assignedTo = assignee ? Number(assignee) : null;
      if (template) {
        const made = await api<Task & { subtasks: Task[] }>(
          "/tasks/from-template",
          {
            method: "POST",
            body: {
              caseId: Number(caseId),
              templateId: template.id,
              dueDate,
              assignedTo,
              title: title.trim() || undefined,
              priority,
            },
          }
        );
        toast("Task created", {
          description: `${made.title} with ${made.subtasks.length} subtasks, due ${fmtDay(dueDate)}.`,
        });
      } else {
        await api<Task>("/tasks", {
          method: "POST",
          body: {
            caseId: Number(caseId),
            title: title.trim(),
            dueDate: dueDate || null,
            assignedTo,
            priority,
          },
        });
        toast("Task created", { description: title.trim() });
      }
      announceDataChanged();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the task."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-8 gap-6 bg-plaster max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div>
          <div className="eyebrow mb-2">New task · Shortcut: N</div>
          <DialogTitle className="display text-4xl text-ink font-extralight">
            {template ? `Start ${template.name}` : "Add a task"}
          </DialogTitle>
          <DialogDescription className="font-serif italic text-lg text-smoke mt-1">
            Pick a template and the subtasks date themselves.
          </DialogDescription>
        </div>

        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="nt-case" className="eyebrow">
                Case
              </label>
              <CaseSelect
                id="nt-case"
                cases={cases ?? []}
                value={caseId}
                onChange={setCaseId}
              />
            </div>
            <div>
              <label htmlFor="nt-template" className="eyebrow">
                Start from
              </label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger
                  id="nt-template"
                  className="w-full mt-2 bg-plaster"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>
                    Blank task (no template)
                  </SelectItem>
                  {(templates ?? []).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="nt-title" className="eyebrow">
              Title{" "}
              {template && (
                <span className="normal-case tracking-normal">(optional)</span>
              )}
            </label>
            <input
              id="nt-title"
              className="field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                template ? template.name : "e.g. Pull lease file from storage"
              }
            />
          </div>

          <div className="grid grid-cols-[1fr_1.5fr_auto] gap-6">
            <div>
              <label htmlFor="nt-due" className="eyebrow">
                Due date
              </label>
              <input
                id="nt-due"
                type="date"
                className="field"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              {weekendWarning(dueDate) && (
                <p className="text-xs text-[#7c5f1c] mt-1.5" role="note">
                  {weekendWarning(dueDate)}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="nt-assignee" className="eyebrow">
                Assign to
              </label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger
                  id="nt-assignee"
                  className="w-full mt-2 bg-plaster"
                >
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} · {ROLE_LABELS[u.role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <fieldset>
              <legend className="eyebrow mb-2">Priority</legend>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(p => (
                  <label
                    key={p}
                    className={cn(
                      "btn-line cursor-pointer px-3.5 py-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink",
                      priority === p &&
                        "bg-navy text-plaster border-navy hover:border-navy"
                    )}
                  >
                    <input
                      type="radio"
                      name="nt-priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="sr-only"
                    />
                    P{p}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {template && (
            <div className="stone-card p-5" aria-live="polite">
              <div className="eyebrow mb-3">
                {dueDate
                  ? `Subtasks it will create · parent due ${fmtDay(dueDate)}`
                  : "Pick a due date to see the subtask dates"}
              </div>
              <ol className="space-y-2">
                {(plan.length
                  ? plan
                  : template.subtasks.map(s => ({
                      title: s.title,
                      offset: s.offset_days_before_due,
                      dueDate: "",
                    }))
                ).map((s, i) => {
                  const raw = dueDate
                    ? format(subDays(toDate(dueDate), s.offset), "yyyy-MM-dd")
                    : "";
                  const moved = raw && raw !== s.dueDate;
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <CornerDownRight
                        className="size-3.5 mt-0.5 shrink-0 text-ash"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-ink">{s.title}</span>
                      <span className="text-smoke tabular-nums text-right">
                        {s.dueDate
                          ? fmtDay(s.dueDate)
                          : `${s.offset} day${s.offset === 1 ? "" : "s"} before`}
                        {moved && (
                          <span className="block text-xs text-ash">
                            moved from {format(toDate(raw), "EEE")} (weekend)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-roof">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button type="submit" className="btn-solid" disabled={saving}>
              {saving
                ? "Saving…"
                : template
                  ? `Create with ${template.subtasks.length} subtasks`
                  : "Create task"}
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
