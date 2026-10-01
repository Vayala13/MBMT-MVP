import AppShell from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import { useNewTask } from "@/components/NewTaskDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ymd } from "@shared/dates";
import type { TemplateSubtask } from "@shared/enums";
import {
  CITE_CHECK_TITLE,
  hasCiteCheck,
  isDraftingTemplate,
  planFromTemplate,
} from "@shared/templates";
import type { TaskTemplate } from "@shared/types";
import { addDays } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  BookCheck,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const needsInput = (t: { name: string; subtasks: TemplateSubtask[] }) =>
  /needs staff input/i.test(t.name) ||
  t.subtasks.some(s => /needs staff input/i.test(s.title));

/** Sample parent due date for previews: 10 days out, like the test script. */
const sampleDue = () => ymd(addDays(new Date(), 10));

type Draft = { id?: number; name: string; subtasks: TemplateSubtask[] };

function TemplateEditor({
  draft,
  onClose,
}: {
  draft: Draft | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<TemplateSubtask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setName(draft.name);
    setRows(
      draft.subtasks.length
        ? draft.subtasks
        : [{ title: "", offset_days_before_due: 0 }]
    );
    setError(null);
  }, [draft]);

  const set = (i: number, patch: Partial<TemplateSubtask>) =>
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: -1 | 1) =>
    setRows(rs => {
      const next = [...rs];
      const [r] = next.splice(i, 1);
      next.splice(i + by, 0, r);
      return next;
    });

  const clean = rows
    .map(r => ({
      title: r.title.trim(),
      offset_days_before_due: Math.max(
        0,
        Math.floor(r.offset_days_before_due || 0)
      ),
    }))
    .filter(r => r.title);
  const willAddCiteCheck = isDraftingTemplate(clean) && !hasCiteCheck(clean);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the template a name.");
    if (!clean.length) return setError("Add at least one subtask.");
    setSaving(true);
    try {
      const saved = await api<TaskTemplate & { citeCheckAdded: boolean }>(
        draft?.id ? `/templates/${draft.id}` : "/templates",
        {
          method: draft?.id ? "PATCH" : "POST",
          body: { name: name.trim(), subtasks: clean },
        }
      );
      toast(draft?.id ? "Template saved" : "Template created", {
        description: saved.citeCheckAdded
          ? `"${CITE_CHECK_TITLE}" was added (firm policy for drafting templates).`
          : saved.name,
      });
      announceDataChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the template."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={draft !== null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-8 gap-6 bg-plaster max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div>
          <div className="eyebrow mb-2">
            {draft?.id ? "Edit template" : "New template"}
          </div>
          <DialogTitle className="display text-4xl text-ink font-extralight">
            {name.trim() || "Untitled template"}
          </DialogTitle>
          <DialogDescription className="text-sm text-smoke mt-2">
            Each subtask is due a set number of days before the parent task.
            Weekend dates move to the Friday before.
          </DialogDescription>
        </div>
        <form onSubmit={save} className="space-y-6" noValidate>
          <div>
            <label htmlFor="tpl-name" className="eyebrow">
              Template name
            </label>
            <input
              id="tpl-name"
              className="field"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="eyebrow mb-3">Subtasks</legend>
            <div className="grid grid-cols-[1fr_7rem_auto] gap-x-4 gap-y-3 items-end">
              <span className="text-xs text-ash">Step</span>
              <span className="text-xs text-ash">Days before due</span>
              <span />
              {rows.map((r, i) => (
                <div key={i} className="contents">
                  <input
                    aria-label={`Subtask ${i + 1}`}
                    className="field py-2"
                    value={r.title}
                    onChange={e => set(i, { title: e.target.value })}
                    placeholder="e.g. Draft motion"
                  />
                  <input
                    aria-label={`Days before due for subtask ${i + 1}`}
                    type="number"
                    min={0}
                    className="field py-2 tabular-nums"
                    value={r.offset_days_before_due}
                    onChange={e =>
                      set(i, { offset_days_before_due: Number(e.target.value) })
                    }
                  />
                  <div className="flex items-center gap-1 pb-1.5">
                    <button
                      type="button"
                      className="p-1 text-ash hover:text-ink disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move subtask ${i + 1} up`}
                    >
                      <ArrowUp className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-ash hover:text-ink disabled:opacity-30"
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Move subtask ${i + 1} down`}
                    >
                      <ArrowDown className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-ash hover:text-roof"
                      onClick={() =>
                        setRows(rs => rs.filter((_, j) => j !== i))
                      }
                      aria-label={`Remove subtask ${i + 1}`}
                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="link-quiet text-sm text-ink mt-4 inline-flex items-center gap-1.5"
              onClick={() =>
                setRows(rs => [...rs, { title: "", offset_days_before_due: 0 }])
              }
            >
              <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />{" "}
              Add subtask
            </button>
          </fieldset>

          {willAddCiteCheck && (
            <p className="stone-card status-soon p-4 text-sm text-smoke flex gap-3">
              <BookCheck
                className="size-4 shrink-0 mt-0.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              This template has a drafting step but no cite-check. "
              {CITE_CHECK_TITLE}" will be added when you save (firm policy).
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-roof">
              {error}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button type="submit" className="btn-solid" disabled={saving}>
              {saving ? "Saving…" : "Save template"}
            </button>
            <button type="button" className="btn-line" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTemplate({
  template,
  onClose,
}: {
  template: TaskTemplate | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (!template) return;
    setBusy(true);
    try {
      await api(`/templates/${template.id}`, { method: "DELETE" });
      toast("Template deleted", { description: template.name });
      announceDataChanged();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not delete the template."
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={template !== null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-8 gap-5 bg-plaster">
        <div className="eyebrow">Delete template</div>
        <DialogTitle className="display text-3xl text-ink font-extralight">
          Delete "{template?.name}"?
        </DialogTitle>
        <DialogDescription className="text-sm text-smoke">
          Tasks already created from it keep their subtasks. This can't be
          undone.
        </DialogDescription>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn-solid bg-roof border-roof hover:bg-ink hover:border-ink"
            onClick={confirm}
            disabled={busy}
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button type="button" className="btn-line" onClick={onClose}>
            Keep it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const { data: templates, error } = useApi<TaskTemplate[]>("/templates");
  const { openNewTask } = useNewTask();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<TaskTemplate | null>(null);
  const due = useMemo(sampleDue, []);

  return (
    <AppShell title="Templates">
      <div className="max-w-[1180px] animate-fade-in-up">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="eyebrow mb-3">Task templates</div>
            <h1 className="display text-5xl text-ink">
              Stop rewriting the same subtasks.
            </h1>
          </div>
          <button
            type="button"
            className="btn-solid shrink-0"
            onClick={() => setEditing({ name: "", subtasks: [] })}
          >
            <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />{" "}
            New template
          </button>
        </div>

        <p className="stone-card status-ok p-4 text-sm text-smoke flex gap-3 mb-10 max-w-3xl">
          <BookCheck
            className="size-4 shrink-0 mt-0.5 text-[#2f6e6b]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>
            <span className="text-ink">Firm policy:</span> every template with a
            drafting step includes "{CITE_CHECK_TITLE}". It's added
            automatically if missing. Nothing reaches an attorney without it.
          </span>
        </p>

        {error ? (
          <ErrorState what="templates" error={error} />
        ) : !templates ? (
          <LoadingState what="templates" />
        ) : templates.length === 0 ? (
          <p className="font-serif italic text-xl text-smoke">
            No templates yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 border-t border-l border-sand">
            {templates.map(t => {
              const plan = planFromTemplate(t.subtasks, due);
              const flag = needsInput(t);
              return (
                <li
                  key={t.id}
                  className={cn(
                    "p-6 border-r border-b border-sand flex flex-col",
                    flag && "bg-limestone/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="display text-3xl text-ink">
                      {t.name.replace(/\s*\(needs staff input\)/i, "")}
                    </h2>
                    {flag && (
                      <span className="badge text-[#7c5f1c] shrink-0">
                        <TriangleAlert
                          className="size-3"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        Needs staff input
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ash mt-1 mb-4">
                    {t.subtasks.length} subtasks · example dates if due{" "}
                    {fmtDay(due)}
                  </div>
                  <ol className="space-y-1.5 text-sm flex-1">
                    {plan.map((s, i) => (
                      <li key={i} className="grid grid-cols-[1fr_auto] gap-4">
                        <span
                          className={cn(
                            "text-ink",
                            /cite[\s-]?check/i.test(s.title) &&
                              "flex items-center gap-1.5"
                          )}
                        >
                          {/cite[\s-]?check/i.test(s.title) && (
                            <BookCheck
                              className="size-3.5 text-ash shrink-0"
                              strokeWidth={1.5}
                              aria-label="cite-check"
                            />
                          )}
                          {s.title}
                        </span>
                        <span className="text-smoke tabular-nums text-right whitespace-nowrap">
                          {s.offset === 0 ? "due day" : `${s.offset}d before`} ·{" "}
                          {fmtDay(s.dueDate)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-center gap-5 mt-6">
                    <button
                      type="button"
                      className="btn-line py-2.5 px-4"
                      onClick={() => openNewTask({ templateId: t.id })}
                    >
                      Use template
                    </button>
                    <button
                      type="button"
                      className="link-quiet text-sm text-ink inline-flex items-center gap-1.5"
                      onClick={() =>
                        setEditing({
                          id: t.id,
                          name: t.name,
                          subtasks: t.subtasks,
                        })
                      }
                    >
                      <Pencil
                        className="size-3.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />{" "}
                      Edit
                    </button>
                    <button
                      type="button"
                      className="link-quiet text-sm text-roof inline-flex items-center gap-1.5"
                      onClick={() => setDeleting(t)}
                    >
                      <Trash2
                        className="size-3.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />{" "}
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <TemplateEditor draft={editing} onClose={() => setEditing(null)} />
      <DeleteTemplate template={deleting} onClose={() => setDeleting(null)} />
    </AppShell>
  );
}
