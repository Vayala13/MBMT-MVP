import { NAV_ITEMS } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@shared/enums";
import { Palette } from "lucide-react";
import { Link, useLocation } from "wouter";

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const [location] = useLocation();
  const active = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-6 py-2.5 text-sm border-l-2 transition-colors duration-300",
        active
          ? "border-aare bg-plaster/10 text-plaster"
          : "border-transparent text-sandstone-light hover:text-plaster hover:bg-plaster/5"
      )}
    >
      <Icon className="size-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, switchUser } = useSession();
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy text-plaster flex flex-col sticky top-0 h-[calc(100vh-2.25rem)] z-10">
        <div className="px-6 pt-8 pb-10">
          <div className="text-[0.68rem] tracking-[0.28em] uppercase text-sandstone-light">
            MBMT
          </div>
          <div className="display text-2xl mt-2">Case Tracker</div>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="mt-auto pb-6">
          <NavLink href="/styleguide" label="Styleguide" icon={Palette} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-sand flex items-center justify-between px-10 bg-plaster">
          <div className="eyebrow">{title}</div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm text-ink">{user.name}</div>
                <div className="text-xs text-ash">
                  {ROLE_LABELS[user.role]} ·{" "}
                  <button
                    type="button"
                    onClick={switchUser}
                    className="link-quiet text-ash hover:text-ink"
                  >
                    Switch user
                  </button>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="size-9 bg-navy text-plaster flex items-center justify-center text-xs tracking-[0.12em]"
              >
                {user.initials}
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 px-10 pt-12 pb-24">{children}</main>
      </div>
    </div>
  );
}
