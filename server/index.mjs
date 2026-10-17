import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchStories } from "./feeds.mjs";

const app = express();
let cache = null;
let inFlight = null;
const refresh = () => {
  if (!inFlight)
    inFlight = fetchStories()
      .then((result) => {
        if (!result.stories.length)
          return cache
            ? { ...cache, sources: result.sources, status: "stale" }
            : { ...result, updatedAt: null, status: "unavailable" };
        cache = { ...result, updatedAt: new Date().toISOString() };
        return { ...cache, status: "live" };
      })
      .finally(() => {
        inFlight = null;
      });
  return inFlight;
};
app.disable("x-powered-by");
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/briefs", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  if (cache && Date.now() - new Date(cache.updatedAt).getTime() < 300000)
    return res.json({ ...cache, status: "live" });
  try {
    res.json(await refresh());
  } catch {
    res.status(503).json({
      error: "News feeds are temporarily unavailable. Please try again.",
    });
  }
});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "dist")));
app.get("/", (_req, res) => res.sendFile(path.join(root, "dist/index.html")));
const server = app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(
    "Signal Brief server listening on port " + (process.env.PORT || 3001),
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
