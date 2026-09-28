import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use("/api", apiRouter);

  if (isProd) {
    // Serve the built client from dist/public
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    // Handle client-side routing - serve index.html for all routes
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  } else {
    // Dev: one port for API + client, Vite runs as middleware with HMR
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "..", "vite.config.ts"),
      server: { middlewareMode: true, ws: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`MBMT Case Tracker running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
