import { api, ApiError } from "@/lib/api";
import { useId, useState } from "react";
import { toast } from "sonner";

/** Quick note on a case (optionally tied to a task). Used by the drawer and the case page. */
export default function AddNoteForm({
  caseId,
  taskId,
  onAdded,
}: {
  caseId: number;
  taskId?: number;
  onAdded: () => void;
}) {
  const inputId = useId();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api("/notes", { method: "POST", body: { caseId, taskId, body } });
      setBody("");
      toast("Note added");
      onAdded();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not save the note"
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor={inputId} className="sr-only">
        Add note
      </label>
      <textarea
        id={inputId}
        rows={2}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Add a note (demo data only)"
        className="field resize-none"
      />
      <button
        type="submit"
        className="btn-solid"
        disabled={saving || !body.trim()}
      >
        {saving ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
