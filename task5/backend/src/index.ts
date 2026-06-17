import express, { Request, Response } from "express";
import cors from "cors";
import { generatePage, PAGE_SIZE } from "./songGenerator";
import { normalizeLocale, SUPPORTED_LOCALES } from "./locales";
import { SongsResponse } from "./types";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, locales: SUPPORTED_LOCALES, pageSize: PAGE_SIZE });
});

/**
 * GET /api/songs?seed=...&page=1&locale=en&likes=4.7
 *
 * All parameters are independent:
 *  - seed / locale change core content
 *  - page paginates (index continues sequentially)
 *  - likes only affects like & review counts (probabilistic, fractional)
 */
app.get("/api/songs", (req: Request, res: Response) => {
  const seed = String(req.query.seed ?? "default").slice(0, 256);
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const locale = normalizeLocale(req.query.locale);

  let likes = Number(req.query.likes);
  if (!Number.isFinite(likes)) likes = 0;
  likes = Math.min(10, Math.max(0, likes));

  const songs = generatePage(seed, page, locale, likes);

  const payload: SongsResponse = {
    seed,
    page,
    locale,
    likes,
    pageSize: PAGE_SIZE,
    songs,
  };
  res.json(payload);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Music store backend listening on http://localhost:${PORT}`);
});
