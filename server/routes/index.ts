import { Router } from "express";

export const apiRouter = Router();

// Phase 0: health check only. Resource routes arrive in Phase 1.
apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, demoDataOnly: true });
});
