import type { User } from "@shared/types";
import { createContext, useCallback, useContext, useState } from "react";
import { setApiUser } from "./api";

/**
 * MVP access gate state, kept per browser session (closes with the tab):
 * 1. the proprietary/privileged acknowledgment, 2. the picked user.
 */
const ACK_KEY = "mbmt.acknowledged";
const USER_KEY = "mbmt.user";

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked: state still lives in memory for this page */
  }
}
function readUser(): User | null {
  try {
    const raw = read(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

type Session = {
  acknowledged: boolean;
  acknowledge: () => void;
  user: User | null;
  pickUser: (u: User) => void;
  switchUser: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [acknowledged, setAck] = useState(() => read(ACK_KEY) === "yes");
  const [user, setUser] = useState<User | null>(() => {
    const u = readUser();
    setApiUser(u?.id ?? null);
    return u;
  });

  const acknowledge = useCallback(() => {
    write(ACK_KEY, "yes");
    setAck(true);
  }, []);
  const pickUser = useCallback((u: User) => {
    write(USER_KEY, JSON.stringify(u));
    setApiUser(u.id);
    setUser(u);
  }, []);
  const switchUser = useCallback(() => {
    write(USER_KEY, null);
    setApiUser(null);
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ acknowledged, acknowledge, user, pickUser, switchUser }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <SessionProvider>");
  return s;
}
