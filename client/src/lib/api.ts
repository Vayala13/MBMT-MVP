import { USER_HEADER } from "@shared/types";

let currentUserId: number | null = null;

/** Called by the session when the picked user changes. */
export function setApiUser(id: number | null) {
  currentUserId = id;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(currentUserId ? { [USER_HEADER]: String(currentUserId) } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(res.status, data.error ?? res.statusText, data.details);
  return data as T;
}
