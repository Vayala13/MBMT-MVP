import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, "Invalid request body", result.error.issues);
  }
  return result.data;
}

export function idParam(req: Request, name = "id"): number {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Bad ${name}`);
  return n;
}

/** Optional positive-integer query param (?caseId=3). */
export function intQuery(req: Request, name: string): number | undefined {
  const raw = req.query[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Bad ${name}`);
  return n;
}

export function strQuery(req: Request, name: string): string | undefined {
  const raw = req.query[name];
  return typeof raw === "string" && raw !== "" ? raw : undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // express.json() parse failures
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
}
