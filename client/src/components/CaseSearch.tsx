import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import { useShortcut } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { CASE_STATUS_LABELS } from "@shared/enums";
import type { Case } from "@shared/types";
import { Search } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "wouter";

type CaseSearchApi = { openCaseSearch: () => void };
const CaseSearchContext = createContext<CaseSearchApi | null>(null);

export function useCaseSearch(): CaseSearchApi {
  const ctx = useContext(CaseSearchContext);
  if (!ctx)
    throw new Error("useCaseSearch must be used inside <CaseSearchProvider>");
  return ctx;
}

const MAX_RESULTS = 8;

/** Every word must match somewhere in caption, client, cause no. or type. */
export function matchCases(cases: Case[], query: string): Case[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sorted = [...cases].sort((a, b) =>
    b.lastTouchedAt.localeCompare(a.lastTouchedAt)
  );
  if (!words.length) return sorted.slice(0, MAX_RESULTS);
  return sorted
    .filter(c => {
      const hay =
        `${c.caption} ${c.clientName} ${c.causeNo ?? ""} ${c.caseType}`.toLowerCase();
      return words.every(w => hay.includes(w));
    })
    .slice(0, MAX_RESULTS);
}

export function CaseSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openCaseSearch = useCallback(() => setOpen(true), []);
  // Keyboard shortcut: / opens case search from anywhere.
  useShortcut("/", openCaseSearch);
  return (
    <CaseSearchContext.Provider value={{ openCaseSearch }}>
      {children}
      <CaseSearchDialog open={open} onOpenChange={setOpen} />
    </CaseSearchContext.Provider>
  );
}

function CaseSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [, navigate] = useLocation();
  const { data: cases, error } = useApi<Case[]>(open ? "/cases" : null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => matchCases(cases ?? [], query), [cases, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);

  const go = (c: Case | undefined) => {
    if (!c) return;
    onOpenChange(false);
    navigate(`/cases/${c.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 bg-plaster top-[18%] translate-y-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search cases</DialogTitle>
        <DialogDescription className="sr-only">
          Type part of a caption, client name, cause number or case type. Use
          the arrow keys and Enter to open a case.
        </DialogDescription>
        <div className="flex items-center gap-3 px-5 border-b border-sand">
          <Search
            className="size-4 text-ash shrink-0"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="case-search-results"
            aria-activedescendant={
              results[active] ? `case-opt-${results[active].id}` : undefined
            }
            aria-label="Search cases"
            className="flex-1 bg-transparent py-4 text-base text-ink placeholder:text-ash outline-none"
            placeholder="Search cases: caption, client, cause no., type"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="text-[0.65rem] text-ash border border-sand px-1.5 py-0.5">
            Esc
          </kbd>
        </div>
        {error ? (
          <p role="alert" className="px-5 py-6 text-sm text-roof">
            Couldn't load cases: {error.message}
          </p>
        ) : !cases ? (
          <p className="px-5 py-6 text-sm text-ash">Loading cases…</p>
        ) : results.length === 0 ? (
          <p className="px-5 py-8 font-serif italic text-xl text-smoke">
            No case matches "{query}".
          </p>
        ) : (
          <ul
            id="case-search-results"
            role="listbox"
            aria-label="Cases"
            className="py-2 max-h-96 overflow-y-auto"
          >
            {results.map((c, i) => (
              <li
                key={c.id}
                id={`case-opt-${c.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
                className={cn(
                  "px-5 py-2.5 cursor-pointer flex items-baseline justify-between gap-4 border-l-[3px]",
                  i === active
                    ? "bg-limestone border-navy"
                    : "border-transparent"
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm text-ink truncate">
                    {c.caption}
                  </span>
                  <span className="block text-xs text-ash truncate">
                    {c.causeNo ?? "No cause no."} · {c.clientName} ·{" "}
                    {c.caseType}
                  </span>
                </span>
                <span className="text-xs text-ash shrink-0 text-right">
                  {CASE_STATUS_LABELS[c.status]}
                  <span className="block">{timeAgo(c.lastTouchedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="px-5 py-2.5 border-t border-sand text-[0.68rem] text-ash">
          ↑ ↓ to move · Enter to open · Esc to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
