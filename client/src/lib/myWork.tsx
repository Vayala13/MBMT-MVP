import { useApi } from "@/hooks/useApi";
import { useSession } from "@/lib/session";
import { myCaseIds } from "@shared/dashboard";
import type { Case, Deadline, Task } from "@shared/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * "My work" filter, shared by every page. On by default; a user's choice is
 * kept for the browser session, per user.
 */
const KEY = (userId: number) => `mbmt.myWork.${userId}`;

type MyWork = {
  myWork: boolean;
  setMyWork: (on: boolean) => void;
  /** Cases the current user is on (lead, or open work assigned). null until loaded. */
  caseIds: Set<number> | null;
};

const MyWorkContext = createContext<MyWork | null>(null);

export function MyWorkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [state, setState] = useState<Record<number, boolean>>(() => {
    try {
      return user
        ? { [user.id]: sessionStorage.getItem(KEY(user.id)) !== "off" }
        : {};
    } catch {
      return {};
    }
  });
  const myWork = user ? (state[user.id] ?? true) : false;
  const setMyWork = useCallback(
    (on: boolean) => {
      if (!user) return;
      try {
        sessionStorage.setItem(KEY(user.id), on ? "on" : "off");
      } catch {
        /* storage blocked: keep it in memory */
      }
      setState(s => ({ ...s, [user.id]: on }));
    },
    [user]
  );

  // Only fetched while the filter is on.
  const cases = useApi<Case[]>(myWork ? "/cases" : null);
  const tasks = useApi<Task[]>(
    myWork && user ? `/tasks?assignedTo=${user.id}&status=open` : null
  );
  const deadlines = useApi<Deadline[]>(myWork ? "/deadlines?open=true" : null);
  const caseIds = useMemo(
    () =>
      myWork && user && cases.data && tasks.data && deadlines.data
        ? myCaseIds(user.id, cases.data, tasks.data, deadlines.data)
        : null,
    [myWork, user, cases.data, tasks.data, deadlines.data]
  );

  return (
    <MyWorkContext.Provider value={{ myWork, setMyWork, caseIds }}>
      {children}
    </MyWorkContext.Provider>
  );
}

export function useMyWork(): MyWork {
  const ctx = useContext(MyWorkContext);
  if (!ctx) throw new Error("useMyWork must be used inside <MyWorkProvider>");
  return ctx;
}
