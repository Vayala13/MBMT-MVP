import { useCaseSearch } from "@/components/CaseSearch";
import { useIncomingCall } from "@/components/IncomingCall";
import ReminderBanner from "@/components/ReminderBanner";
import { useLogCall } from "@/components/LogCallDialog";
import { useNewTask } from "@/components/NewTaskDialog";
import { useMyWork } from "@/lib/myWork";
import { NAV_ITEMS } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@shared/enums";
import {
  FlaskConical,
  Palette,
  Phone,
  Plus,
  Search,
  UserCheck,
} from "lucide-react";
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
  const { openLogCall } = useLogCall();
  const { simulateIncomingCall } = useIncomingCall();
  const { openNewTask } = useNewTask();
  const { openCaseSearch } = useCaseSearch();
  const { myWork, setMyWork } = useMyWork();
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy text-plaster flex flex-col sticky top-0 h-[calc(100vh-2.25rem)] z-10">
        <div className="px-6 pt-8 pb-10">
          <div className="text-[0.68rem] tracking-[0.28em] uppercase text-sandstone-light">
            MBMT
          </div>
          <div className="display text-2xl mt-2">Case Tracker</div>
        </div>
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => openLogCall()}
            className="w-full flex items-center justify-between gap-2 border border-plaster/25 px-4 py-3 text-[0.7rem] tracking-[0.2em] uppercase text-plaster hover:bg-aare hover:border-aare transition-colors duration-300"
          >
            <span className="flex items-center gap-2.5">
              <Phone
                className="size-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Log a call
            </span>
            <kbd className="font-sans text-[0.65rem] tracking-normal border border-plaster/30 px-1.5 py-0.5 text-sandstone-light">
              C
            </kbd>
          </button>
          {(
            [
              ["New task", "N", Plus, () => openNewTask()],
              ["Search cases", "/", Search, openCaseSearch],
            ] as const
          ).map(([label, key, Icon, onClick]) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="mt-1.5 w-full flex items-center justify-between gap-2 px-4 py-2 text-[0.7rem] tracking-[0.2em] uppercase text-sandstone-light hover:text-plaster hover:bg-plaster/5 transition-colors duration-300"
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className="size-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {label}
              </span>
              <kbd className="font-sans text-[0.65rem] tracking-normal border border-plaster/20 px-1.5 py-0.5">
                {key}
              </kbd>
            </button>
          ))}
          <button
            type="button"
            onClick={simulateIncomingCall}
            className="mt-2 w-full flex items-center gap-2 px-1 py-1.5 text-xs text-sandstone-light hover:text-plaster transition-colors duration-300"
          >
            <FlaskConical
              className="size-3.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Simulate incoming call
          </button>
        </div>
        {user && (
          <div className="px-6 pb-6">
            <button
              type="button"
              aria-pressed={myWork}
              onClick={() => setMyWork(!myWork)}
              title="Show only cases, tasks and deadlines that are yours"
              className={cn(
                "w-full flex items-center justify-between gap-2 border px-4 py-2 text-[0.7rem] tracking-[0.2em] uppercase transition-colors duration-300",
                myWork
                  ? "bg-plaster border-plaster text-navy hover:bg-sandstone-light"
                  : "border-plaster/25 text-sandstone-light hover:text-plaster hover:bg-plaster/5"
              )}
            >
              <span className="flex items-center gap-2.5">
                <UserCheck
                  className="size-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                My work
              </span>
              {myWork ? "On" : "Off"}
            </button>
          </div>
        )}
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV_ITEMS.filter(
            item => !item.roles || (user && item.roles.includes(user.role))
          ).map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="mt-auto pb-6">
          <NavLink href="/styleguide" label="Styleguide" icon={Palette} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-sand flex items-center justify-between px-6 xl:px-10 bg-plaster">
          <div className="eyebrow">{title}</div>
          {user && (
            <div className="flex items-center gap-6">
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
            </div>
          )}
        </header>
        <main className="flex-1 px-6 xl:px-10 pt-12 pb-24">
          <div className="max-w-[1180px]">
            <ReminderBanner />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
