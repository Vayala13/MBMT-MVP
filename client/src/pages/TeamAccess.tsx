import AppShell from "@/components/AppShell";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { PROPOSED_PERMISSIONS, type Access } from "@shared/access";
import { ROLE_LABELS, USER_ROLES } from "@shared/enums";
import type { User } from "@shared/types";
import { Check, CircleHelp, Minus, TriangleAlert } from "lucide-react";

const CELL: Record<
  Access,
  { label: string; icon: typeof Check; className: string }
> = {
  yes: { label: "Yes", icon: Check, className: "text-[#2f6e6b]" },
  no: { label: "No", icon: Minus, className: "text-ash" },
  limited: { label: "Limited", icon: CircleHelp, className: "text-[#7c5f1c]" },
};

export default function TeamAccess() {
  const { data: users } = useApi<User[]>("/users");

  return (
    <AppShell title="Team & Access">
      <div className="max-w-[1180px] animate-fade-in-up">
        <div className="eyebrow mb-3">Team &amp; Access</div>
        <h1 className="display text-5xl text-ink mb-3">Who can do what.</h1>
        <p className="font-serif italic text-2xl text-smoke mb-8">
          A proposal, not a rule yet.
        </p>

        <p className="stone-card status-soon p-5 text-sm text-smoke flex gap-3 mb-12 max-w-3xl">
          <TriangleAlert
            className="size-4 shrink-0 mt-0.5 text-[#7c5f1c]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>
            <span className="text-ink">
              Proposed. Confirm with Jesse (IT) and Tomas.
            </span>{" "}
            The prototype does not enforce any of this: everyone can do
            everything, and there are no passwords. Real sign-in and access
            rules come after the pilot.
          </span>
        </p>

        <section aria-labelledby="matrix-title" className="mb-16">
          <h2 id="matrix-title" className="display text-3xl text-ink mb-5">
            Access by role
          </h2>
          <table className="w-full text-sm">
            <caption className="sr-only">
              Proposed permissions by role. Proposed, confirm with Jesse and
              Tomas.
            </caption>
            <thead>
              <tr className="border-b border-sand text-left">
                <th
                  scope="col"
                  className="eyebrow font-normal py-3 pr-4 w-[30%]"
                >
                  Permission
                </th>
                {USER_ROLES.map(r => (
                  <th
                    key={r}
                    scope="col"
                    className="eyebrow font-normal py-3 pr-4"
                  >
                    {ROLE_LABELS[r]}
                  </th>
                ))}
                <th scope="col" className="eyebrow font-normal py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {PROPOSED_PERMISSIONS.map(p => (
                <tr key={p.id} className="data-row align-top">
                  <th scope="row" className="py-4 pr-4 text-left font-light">
                    <div className="text-ink">{p.label}</div>
                    <div className="text-xs text-ash mt-0.5">
                      {p.description}
                    </div>
                  </th>
                  {USER_ROLES.map(r => {
                    const a = p.roles[r];
                    const { label, icon: Icon, className } = CELL[a];
                    return (
                      <td key={r} className="py-4 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            className
                          )}
                        >
                          <Icon
                            className="size-3.5"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          {label}
                        </span>
                        {a === "limited" && p.limits?.[r] && (
                          <div className="text-xs text-ash mt-1 max-w-44">
                            {p.limits[r]}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-4">
                    <span className="badge text-[#7c5f1c] whitespace-nowrap">
                      Proposed
                    </span>
                    <div className="text-xs text-ash mt-1">
                      Confirm with Jesse / Tomas
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="team-title">
          <h2 id="team-title" className="display text-3xl text-ink mb-5">
            Team (demo)
          </h2>
          <ul className="grid grid-cols-3 border-t border-l border-sand">
            {USER_ROLES.flatMap(r =>
              (users ?? []).filter(u => u.role === r)
            ).map(u => (
              <li
                key={u.id}
                className="p-5 border-r border-b border-sand flex items-center gap-4"
              >
                <span
                  aria-hidden="true"
                  className="size-10 shrink-0 bg-navy text-plaster flex items-center justify-center text-xs tracking-[0.12em]"
                >
                  {u.initials}
                </span>
                <span>
                  <span className="block text-ink">{u.name}</span>
                  <span className="block text-xs text-ash">
                    {ROLE_LABELS[u.role]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ash mt-3">
            Fictional people for the prototype.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
