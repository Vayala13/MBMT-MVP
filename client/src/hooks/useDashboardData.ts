import { useApi } from "@/hooks/useApi";
import type { Case, Deadline, Task, User } from "@shared/types";
import { useCallback, useMemo } from "react";

/** Everything the dashboard needs, plus lookups and one refetch for all of it. */
export function useDashboardData() {
  const cases = useApi<Case[]>("/cases");
  const deadlines = useApi<Deadline[]>("/deadlines");
  const tasks = useApi<Task[]>("/tasks?status=open");
  const users = useApi<User[]>("/users");

  const caseById = useMemo(
    () => new Map((cases.data ?? []).map(c => [c.id, c])),
    [cases.data]
  );
  const userById = useMemo(
    () => new Map((users.data ?? []).map(u => [u.id, u])),
    [users.data]
  );

  const refetchCases = cases.refetch;
  const refetchDeadlines = deadlines.refetch;
  const refetchTasks = tasks.refetch;
  const refetch = useCallback(() => {
    refetchCases();
    refetchDeadlines();
    refetchTasks();
  }, [refetchCases, refetchDeadlines, refetchTasks]);

  const ready = cases.data && deadlines.data && tasks.data && users.data;
  return {
    cases: cases.data ?? [],
    deadlines: deadlines.data ?? [],
    tasks: tasks.data ?? [],
    caseById,
    userById,
    ready: Boolean(ready),
    error: cases.error ?? deadlines.error ?? tasks.error ?? users.error,
    refetch,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
