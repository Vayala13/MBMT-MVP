import AppShell from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import { useMyWork } from "@/lib/myWork";
import { cn } from "@/lib/utils";
import { CASE_STATUS_LABELS, type CaseStatus } from "@shared/enums";
import { isStale } from "@shared/status";
import type { Case, User } from "@shared/types";
import { parseISO } from "date-fns";
import { ArrowDown, ArrowUp, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const TABS: { id: string; label: string; statuses: CaseStatus[] }[] = [
  { id: "active", label: "Active", statuses: ["active"] },
  { id: "intake", label: "Intake list", statuses: ["inquiry", "consult"] },
  { id: "referred", label: "Referred out", statuses: ["referred_out"] },
  { id: "closed", label: "Closed", statuses: ["closed"] },
];

const ALL = "all";

export default function Cases() {
  const { data: cases, error } = useApi<Case[]>("/cases");
  const { data: users } = useApi<User[]>("/users");
  const [tab, setTab] = useState("active");
  const [attorney, setAttorney] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [staleOnly, setStaleOnly] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);

  const today = useMemo(() => new Date(), []);
  const userById = useMemo(
    () => new Map((users ?? []).map(u => [u.id, u])),
    [users]
  );
  const attorneys = (users ?? []).filter(u => u.role === "attorney");
  const stale = (c: Case) => isStale(parseISO(c.lastTouchedAt), today);

  const current = TABS.find(t => t.id === tab)!;
  const { myWork, caseIds } = useMyWork();
  const mineOnly = (c: Case) => !myWork || Boolean(caseIds?.has(c.id));
  const inTab = (cases ?? []).filter(
    c => current.statuses.includes(c.status) && mineOnly(c)
  );
  const types = [...new Set(inTab.map(c => c.caseType))].sort();

  const rows = inTab
    .filter(c => attorney === ALL || String(c.leadAttorneyId) === attorney)
    .filter(c => type === ALL || c.caseType === type)
    .filter(c => !staleOnly || stale(c))
    .sort((a, b) =>
      newestFirst
        ? b.lastTouchedAt.localeCompare(a.lastTouchedAt)
        : a.lastTouchedAt.localeCompare(b.lastTouchedAt)
    );

  const filtersOn = attorney !== ALL || type !== ALL || staleOnly;

  return (
    <AppShell title="Cases">
      <div className="max-w-[1180px] animate-fade-in-up">
        <div className="eyebrow mb-3">Cases</div>
        <h1 className="display text-5xl text-ink mb-3">
          Every matter, one list.
        </h1>
        <p className="font-serif italic text-2xl text-smoke mb-10">
          Replaces the case list and active cases spreadsheets.
        </p>
        {myWork && (
          <p className="text-sm text-smoke -mt-6 mb-8 flex items-center gap-2">
            <UserCheck
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            My work is on: only cases you lead or have open work on.
          </p>
        )}

        <Tabs
          value={tab}
          onValueChange={v => {
            setTab(v);
            setType(ALL);
          }}
        >
          <TabsList className="bg-transparent p-0 h-auto w-full justify-start gap-8 border-b border-sand">
            {TABS.map(t => {
              const n = (cases ?? []).filter(
                c => t.statuses.includes(c.status) && mineOnly(c)
              ).length;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex-none h-auto px-0 py-3 -mb-px border-0 border-b-2 border-transparent data-[state=active]:border-navy data-[state=active]:bg-transparent text-[0.72rem] tracking-[0.22em] uppercase font-normal text-ash data-[state=active]:text-ink"
                >
                  {t.label}{" "}
                  <span className="tabular-nums tracking-normal">({n})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {/* One panel for the active tab, so each tab points at a real panel (screen readers). */}
          <TabsContent value={tab} forceMount>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-8 py-6">
              <div>
                <label htmlFor="f-attorney" className="eyebrow">
                  Attorney
                </label>
                <Select value={attorney} onValueChange={setAttorney}>
                  <SelectTrigger
                    id="f-attorney"
                    className="w-52 mt-2 bg-plaster"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All attorneys</SelectItem>
                    {attorneys.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="f-type" className="eyebrow">
                  Case type
                </label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="f-type" className="w-60 mt-2 bg-plaster">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All types</SelectItem>
                    {types.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2.5 h-9">
                <Checkbox
                  id="f-stale"
                  checked={staleOnly}
                  onCheckedChange={v => setStaleOnly(v === true)}
                />
                <label htmlFor="f-stale" className="text-sm text-ink">
                  Stale only{" "}
                  <span className="text-ash">(untouched &gt; 1 year)</span>
                </label>
              </div>
              {filtersOn && (
                <button
                  type="button"
                  className="link-quiet text-sm text-smoke h-9"
                  onClick={() => {
                    setAttorney(ALL);
                    setType(ALL);
                    setStaleOnly(false);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {error ? (
              <ErrorState what="cases" error={error} />
            ) : !cases ? (
              <LoadingState what="cases" />
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {current.label} cases, sorted by last touched
                </caption>
                <thead>
                  <tr className="text-left border-b border-sand">
                    <th scope="col" className="eyebrow font-normal py-3 pr-4">
                      Case
                    </th>
                    <th scope="col" className="eyebrow font-normal py-3 pr-4">
                      {tab === "referred"
                        ? "Referred to"
                        : tab === "intake"
                          ? "Stage"
                          : "Type"}
                    </th>
                    <th scope="col" className="eyebrow font-normal py-3 pr-4">
                      Lead attorney
                    </th>
                    <th
                      scope="col"
                      className="py-3"
                      aria-sort={newestFirst ? "descending" : "ascending"}
                    >
                      <button
                        type="button"
                        onClick={() => setNewestFirst(v => !v)}
                        className="eyebrow font-normal inline-flex items-center gap-1.5 hover:text-ink"
                      >
                        Last touched
                        {newestFirst ? (
                          <ArrowDown
                            className="size-3"
                            strokeWidth={1.5}
                            aria-label="newest first"
                          />
                        ) : (
                          <ArrowUp
                            className="size-3"
                            strokeWidth={1.5}
                            aria-label="oldest first"
                          />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 font-serif italic text-xl text-smoke"
                      >
                        {filtersOn
                          ? "No cases match these filters."
                          : "No cases here yet."}
                      </td>
                    </tr>
                  ) : (
                    rows.map(c => {
                      const isStaleCase = stale(c);
                      const lead = c.leadAttorneyId
                        ? userById.get(c.leadAttorneyId)
                        : undefined;
                      const toucher = c.lastTouchedBy
                        ? userById.get(c.lastTouchedBy)
                        : undefined;
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            "data-row",
                            isStaleCase && "status-stale"
                          )}
                        >
                          <td
                            className={cn(
                              "py-3 pr-4",
                              isStaleCase ? "pl-4" : "pl-0"
                            )}
                          >
                            <Link
                              href={`/cases/${c.id}`}
                              className="link-quiet text-ink"
                            >
                              {c.caption}
                            </Link>
                            <div className="text-xs text-ash mt-0.5">
                              {c.causeNo ?? "No cause no."} · {c.clientName}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-smoke">
                            {tab === "referred"
                              ? (c.referredTo ?? "—")
                              : tab === "intake"
                                ? `${CASE_STATUS_LABELS[c.status]} · ${c.caseType}`
                                : c.caseType}
                          </td>
                          <td className="py-3 pr-4 text-smoke">
                            {lead?.name ?? "Unassigned"}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-smoke">
                                {toucher?.name ?? "Unknown"}
                                <span className="block text-xs text-ash">
                                  {timeAgo(c.lastTouchedAt)}
                                </span>
                              </span>
                              {isStaleCase && <StatusBadge status="stale" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
            {cases && (
              <p className="text-xs text-ash mt-4">
                Showing {rows.length} of {inTab.length}{" "}
                {current.label.toLowerCase()} case
                {inTab.length === 1 ? "" : "s"}.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
