import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import StatusBadge, { STATUS_ICONS } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AA_TEXT, contrastRatio } from "@/lib/contrast";
import { COLOR_TOKENS, TEXT_ON_SURFACE } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@shared/status";
import { ArrowRight, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

// Every name below is invented for the demo. No real clients or cases.
const SAMPLE_ROWS: {
  status: Status;
  title: string;
  caption: string;
  when: string;
  who: string;
}[] = [
  {
    status: "overdue",
    title: "Response to discovery requests",
    caption: "Pemberton v. Hollow Oak Supply Co.",
    when: "3 days overdue",
    who: "Assigned to Pip Marlowe",
  },
  {
    status: "soon",
    title: "Reply ISO motion for summary judgment",
    caption: "Quillfeather v. Bramblewood Transit LLC",
    when: "in 5 days",
    who: "Assigned to Pip Marlowe",
  },
  {
    status: "ok",
    title: "Deposition outline — corporate rep",
    caption: "Marchbank v. Tidewell Logistics",
    when: "in 19 days",
    who: "Assigned to Octavia Fernsby",
  },
  {
    status: "stale",
    title: "Case untouched for 14 months",
    caption: "In re Estate of Figgins (fictional)",
    when: "Last touched by Wren Tolliver on 7/12/2025",
    who: "Lead: Octavia Fernsby",
  },
];

function Block({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-14 border-t border-sand">
      <div className="eyebrow mb-3">{label}</div>
      <h2 className="display text-4xl text-ink mb-10">{title}</h2>
      {children}
    </section>
  );
}

function Ratio({ fg, bg }: { fg: string; bg: string }) {
  const r = contrastRatio(fg, bg);
  const pass = r >= AA_TEXT;
  return (
    <span className={cn("tabular-nums", pass ? "text-smoke" : "text-roof")}>
      {r.toFixed(2)}:1 {pass ? "AA" : "rail only"}
    </span>
  );
}

export default function Styleguide() {
  return (
    <AppShell title="Styleguide">
      <div className="max-w-6xl animate-fade-in-up">
        <SectionHeader
          index="00"
          label="Styleguide"
          title="Zurich / Bern, for case work."
          aside="Every token, button, badge, status row and field used in the MBMT Case Tracker. Square corners, no shadows, no gradients."
        />

        {/* ---------------------------------------------------------- Colors */}
        <Block label="01 — Tokens" title="Color">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-px bg-sand border border-sand">
            {COLOR_TOKENS.map(t => (
              <div key={t.name} className="bg-plaster">
                <div
                  className="h-20 border-b border-sand"
                  style={{ background: t.hex }}
                />
                <div className="p-4 text-xs leading-relaxed">
                  <div className="text-ink text-sm">{t.name}</div>
                  <div className="text-ash tabular-nums">{t.hex}</div>
                  <div className="text-smoke mt-1">{t.use}</div>
                  <div className="mt-2">
                    {"surface" in t ? (
                      <span className="text-ash">Surface</span>
                    ) : (
                      <>
                        on plaster: <Ratio fg={t.hex} bg="#f8f6f2" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="eyebrow mt-12 mb-4">
            Small-text contrast (WCAG AA ≥ 4.5:1)
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th scope="col" className="eyebrow font-normal py-2">
                  Text color
                </th>
                {TEXT_ON_SURFACE.surfaces.map(s => (
                  <th
                    key={s.name}
                    scope="col"
                    className="eyebrow font-normal py-2"
                  >
                    on {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEXT_ON_SURFACE.text.map(t => (
                <tr key={t.name} className="data-row">
                  <td className="py-3" style={{ color: t.hex }}>
                    {t.name} <span className="text-ash">{t.hex}</span>
                  </td>
                  {TEXT_ON_SURFACE.surfaces.map(s => (
                    <td key={s.name} className="py-3">
                      <Ratio fg={t.hex} bg={s.hex} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        {/* ------------------------------------------------------ Typography */}
        <Block label="02 — Type" title="Typography">
          <div className="space-y-10">
            <div>
              <div className="eyebrow mb-3">Display · Inter Tight 200</div>
              <div className="display text-7xl text-ink">
                Due in three weeks
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <div className="eyebrow mb-3">Body · Inter Tight 300</div>
                <p className="text-base leading-relaxed text-ink max-w-prose">
                  Reply in support of the motion for summary judgment is due on
                  the third Monday. Exhibits A through F are labeled; cite-check
                  is open.
                </p>
                <p className="text-sm leading-relaxed text-smoke mt-3 max-w-prose">
                  Secondary copy in smoke. Metadata and timestamps in ash.
                </p>
              </div>
              <div>
                <div className="eyebrow mb-3">
                  Accent · Cormorant Garamond italic
                </div>
                <p className="font-serif italic text-3xl text-smoke">
                  Nothing overdue. A quiet morning.
                </p>
                <p className="text-xs text-ash mt-3">
                  Page subtitles and empty states only.
                </p>
              </div>
            </div>
            <div>
              <div className="eyebrow mb-3">Eyebrow</div>
              <div className="eyebrow">Week 3 · Oct 12 – Oct 18</div>
            </div>
          </div>
        </Block>

        {/* --------------------------------------------------------- Buttons */}
        <Block label="03 — Actions" title="Buttons & links">
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              className="btn-solid"
              onClick={() => toast("Call logged (demo)")}
            >
              <Phone className="size-3.5" strokeWidth={1.5} /> Log a call
            </button>
            <button type="button" className="btn-line">
              <Plus className="size-3.5" strokeWidth={1.5} /> New task
            </button>
            <button type="button" className="btn-solid" disabled>
              Disabled
            </button>
            <a
              href="#top"
              className="link-quiet text-sm text-ink inline-flex items-center gap-2"
            >
              View case <ArrowRight className="size-3.5" strokeWidth={1.5} />
            </a>
          </div>
          <p className="text-xs text-ash mt-6">
            .btn-solid (navy → aare on hover) · .btn-line · .link-quiet. Click
            "Log a call" to preview a sonner toast.
          </p>
        </Block>

        {/* ---------------------------------------------------------- Badges */}
        <Block label="04 — Status" title="Badges">
          <div className="flex flex-wrap gap-4">
            {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="stone-card p-6 mt-8 flex flex-wrap gap-4">
            {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
              <StatusBadge key={s} status={s} />
            ))}
            <span className="text-xs text-ash self-center">on limestone</span>
          </div>
          <p className="text-xs text-ash mt-6">
            Color is never the only signal: every badge carries a text label and
            an icon.
          </p>
        </Block>

        {/* ----------------------------------------------------- Status rows */}
        <Block label="05 — Rows" title="Status rows">
          <div className="border-t border-sand">
            {SAMPLE_ROWS.map(r => {
              const Icon = STATUS_ICONS[r.status];
              return (
                <div
                  key={r.title}
                  className={cn(
                    "data-row status-" + r.status,
                    "grid grid-cols-12 items-center gap-4 pl-5 pr-4 py-4 transition-colors duration-300"
                  )}
                >
                  <div className="col-span-6">
                    <div className="text-sm text-ink flex items-center gap-2">
                      <Icon
                        className="size-3.5 text-ash"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {r.title}
                    </div>
                    <div className="text-xs text-ash mt-1">{r.caption}</div>
                  </div>
                  <div className="col-span-3 text-xs text-smoke">{r.who}</div>
                  <div className="col-span-3 flex flex-col items-end gap-1.5">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-ash">{r.when}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Block>

        {/* ----------------------------------------------------------- Cards */}
        <Block label="06 — Surfaces" title="Stone cards">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-sand border border-sand">
            {[
              ["Total cases", "25"],
              ["Active cases", "15"],
              ["Overdue tasks", "4"],
              ["Open tasks", "38"],
            ].map(([label, n]) => (
              <div key={label} className="stone-card p-6">
                <div className="eyebrow mb-4">{label}</div>
                <div className="display text-5xl text-ink tabular-nums">
                  {n}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ash mt-6">Sample numbers only.</p>
        </Block>

        {/* ---------------------------------------------------------- Fields */}
        <Block label="07 — Input" title="Fields">
          <form
            className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-3xl"
            onSubmit={e => e.preventDefault()}
          >
            <div>
              <label htmlFor="sg-with" className="eyebrow">
                Spoke with
              </label>
              <input
                id="sg-with"
                className="field"
                placeholder="e.g. opposing counsel"
              />
            </div>
            <div>
              <label htmlFor="sg-date" className="eyebrow">
                New due date
              </label>
              <input id="sg-date" type="date" className="field" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="sg-summary" className="eyebrow">
                Summary
              </label>
              <textarea
                id="sg-summary"
                rows={2}
                className="field resize-none"
                placeholder="What was discussed"
              />
            </div>
            <div>
              <Label htmlFor="sg-reason" className="eyebrow">
                Reason for change
              </Label>
              <Select>
                <SelectTrigger
                  id="sg-reason"
                  className="w-full mt-2 bg-plaster"
                >
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rule11">Rule 11 agreement</SelectItem>
                  <SelectItem value="court">Court order</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Checkbox id="sg-follow" />
              <Label
                htmlFor="sg-follow"
                className="text-sm font-light text-ink"
              >
                Follow-up needed
              </Label>
            </div>
          </form>
        </Block>

        {/* ---------------------------------------------------------- Motion */}
        <Block label="08 — Motion" title="Slow fades only">
          <p className="text-sm text-smoke max-w-prose">
            .animate-fade-in-up — 1.1s ease-out, 12px rise, nothing bounces.
            Disabled entirely under prefers-reduced-motion.
          </p>
        </Block>
      </div>
    </AppShell>
  );
}
