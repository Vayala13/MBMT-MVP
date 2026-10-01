import AppShell from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import CountdownList from "@/components/dashboard/CountdownList";
import DeadlineStrip from "@/components/dashboard/DeadlineStrip";
import ItemDrawer from "@/components/dashboard/ItemDrawer";
import MetricRow from "@/components/dashboard/MetricRow";
import StaleCases from "@/components/dashboard/StaleCases";
import type { DrawerItem } from "@/components/dashboard/types";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMyWork } from "@/lib/myWork";
import { useSession } from "@/lib/session";
import {
  buildStrip,
  countdown,
  metrics,
  staleCases,
} from "@shared/dashboard";
import { format, startOfDay } from "date-fns";
import { UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

export default function Dashboard() {
  const { user } = useSession();
  const data = useDashboardData();
  const [drawer, setDrawer] = useState<DrawerItem | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  // "My work": only my deadlines/tasks, and only cases I'm on.
  const { myWork, caseIds } = useMyWork();
  const filtering = myWork && user !== null;
  const scoped = useMemo(() => {
    if (!filtering || !user) return data;
    return {
      ...data,
      cases: data.cases.filter(c => caseIds?.has(c.id)),
      deadlines: data.deadlines.filter(d => d.assignedTo === user.id),
      tasks: data.tasks.filter(t => t.assignedTo === user.id),
    };
  }, [data, filtering, caseIds, user]);

  const view = useMemo(() => {
    const rows = countdown(scoped.deadlines, today);
    return {
      metrics: metrics(scoped.cases, scoped.tasks, today),
      strip: buildStrip(scoped.deadlines, today),
      countdown: rows,
      stale: staleCases(scoped.cases, today),
    };
  }, [scoped, today]);

  return (
    <AppShell title="Dashboard">
      <div className="max-w-[1180px] space-y-14 animate-fade-in-up">
        <header>
          <div className="eyebrow mb-3">{format(today, "EEEE, MMMM d")}</div>
          <h1 className="display text-5xl text-ink">
            {user
              ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user.name.split(" ")[0]}.`
              : "Dashboard"}
          </h1>
          {filtering && (
            <p className="text-sm text-smoke mt-3 flex items-center gap-2">
              <UserCheck
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              My work is on: only your deadlines, tasks and cases. Turn it off
              in the sidebar to see the whole firm.
            </p>
          )}
        </header>

        {data.error ? (
          <ErrorState what="the dashboard" error={data.error} />
        ) : !data.ready ? (
          <LoadingState what="the dashboard" />
        ) : (
          <>
            <MetricRow m={view.metrics} />
            <DeadlineStrip
              days={view.strip}
              today={today}
              caseById={data.caseById}
              onOpen={setDrawer}
            />
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-7">
                <CountdownList
                  rows={view.countdown}
                  today={today}
                  caseById={data.caseById}
                  userById={data.userById}
                  onOpen={setDrawer}
                />
              </div>
              <div className="col-span-5">
                <StaleCases
                  cases={view.stale}
                  userById={data.userById}
                  onOpen={setDrawer}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <ItemDrawer
        item={drawer}
        today={today}
        caseById={data.caseById}
        userById={data.userById}
        onClose={() => setDrawer(null)}
        onChanged={data.refetch}
      />
    </AppShell>
  );
}
