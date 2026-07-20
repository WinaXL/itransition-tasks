import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isRecruiter, requireRole } from "../auth";
import { parsePagination, paginationMeta } from "./positions";

export const searchRouter = Router();
export const homeRouter = Router();
export const usersRouter = Router();

/** Strips the window-function total off raw rows into a { items, total } pair. */
function unwrapTotal<T extends { total?: number }>(rows: T[]) {
  const total = rows[0]?.total ?? 0;
  return { items: rows.map(({ total: _total, ...rest }) => rest), total };
}

/**
 * Full-text search (header search box) built on PostgreSQL's native engine:
 * to_tsvector / websearch_to_tsquery with relevance ranking. Paginated with
 * LIMIT/OFFSET; totals come from a COUNT(*) OVER() window so each result set
 * needs a single query.
 */
searchRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const { page, limit, skip } = parsePagination(req.query);
  const empty = { items: [], total: 0 };
  if (!q) return res.json({ positions: empty, attributes: empty, cvs: empty, meta: paginationMeta(0, page, limit) });

  const positionRows = await prisma.$queryRaw<
    { id: string; title: string; company: string; shortdescription: string; rank: number; total: number }[]
  >(Prisma.sql`
    SELECT id, title, company, "shortDescription" AS shortdescription,
           ts_rank(to_tsvector('simple', title || ' ' || company || ' ' || "shortDescription"),
                   websearch_to_tsquery('simple', ${q})) AS rank,
           COUNT(*) OVER()::int AS total
    FROM "Position"
    WHERE to_tsvector('simple', title || ' ' || company || ' ' || "shortDescription")
          @@ websearch_to_tsquery('simple', ${q})
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${skip}`);
  const positions = unwrapTotal(positionRows);

  let attributes = empty as { items: unknown[]; total: number };
  let cvs = empty as { items: unknown[]; total: number };
  if (req.user) {
    const attributeRows = await prisma.$queryRaw<{ id: string; name: string; description: string; total: number }[]>(Prisma.sql`
      SELECT id, name, description, COUNT(*) OVER()::int AS total
      FROM "Attribute"
      WHERE to_tsvector('simple', name || ' ' || description) @@ websearch_to_tsquery('simple', ${q})
      ORDER BY name
      LIMIT ${limit} OFFSET ${skip}`);
    attributes = unwrapTotal(attributeRows);
  }
  if (isRecruiter(req)) {
    // Published CVs matched by candidate name, attribute values or project text.
    const cvRows = await prisma.$queryRaw<
      { id: string; userName: string; positionTitle: string; likes: number; total: number }[]
    >(Prisma.sql`
      SELECT c.id, u.name AS "userName", p.title AS "positionTitle",
             (SELECT COUNT(*)::int FROM "Like" l WHERE l."cvId" = c.id) AS likes,
             COUNT(*) OVER()::int AS total
      FROM "Cv" c
      JOIN "User" u ON u.id = c."userId"
      JOIN "Position" p ON p.id = c."positionId"
      WHERE c.status = 'PUBLISHED' AND (
        to_tsvector('simple', u.name) @@ websearch_to_tsquery('simple', ${q})
        OR EXISTS (
          SELECT 1 FROM "AttributeValue" av
          WHERE av."userId" = c."userId"
            AND to_tsvector('simple', av.value) @@ websearch_to_tsquery('simple', ${q}))
        OR EXISTS (
          SELECT 1 FROM "Project" pr
          WHERE pr."userId" = c."userId"
            AND to_tsvector('simple', pr.name || ' ' || pr.description) @@ websearch_to_tsquery('simple', ${q}))
      )
      ORDER BY u.name
      LIMIT ${limit} OFFSET ${skip}`);
    cvs = unwrapTotal(cvRows);
  }
  const maxTotal = Math.max(positions.total, attributes.total, cvs.total);
  res.json({ positions, attributes, cvs, meta: paginationMeta(maxTotal, page, limit) });
});

/** Main page data: latest & popular positions, tag cloud, public statistics. */
homeRouter.get("/", async (req, res) => {
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const [latest, popular, stats, tags] = await Promise.all([
    prisma.position.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { _count: { select: { cvs: true } } },
    }),
    prisma.position.findMany({
      orderBy: { cvs: { _count: "desc" } },
      take: 5,
      include: { _count: { select: { cvs: true } } },
    }),
    Promise.all([
      prisma.cv.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.cv.count(),
      prisma.position.count(),
      prisma.user.count({ where: { role: "CANDIDATE" } }),
      prisma.user.count({ where: { role: "RECRUITER" } }),
    ]),
    // Tag cloud weights = number of projects using the tag.
    prisma.tag.findMany({ include: { _count: { select: { projects: true } } }, take: 50 }),
  ]);
  res.json({
    latest,
    popular,
    stats: {
      cvsLast24h: stats[0],
      totalCvs: stats[1],
      totalPositions: stats[2],
      totalCandidates: stats[3],
      totalRecruiters: stats[4],
    },
    tags: tags.map((t) => ({ id: t.id, name: t.name, weight: t._count.projects })).filter((t) => t.weight > 0),
    authenticated: Boolean(req.user),
  });
});

// ---------- Admin: user management (paginated: ?page=&limit=) ----------
usersRouter.get("/", requireRole("ADMIN"), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [total, items] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, blocked: true, provider: true, createdAt: true,
        _count: { select: { cvs: true, projects: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  res.json({ items, meta: paginationMeta(total, page, limit) });
});

usersRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const parsed = z
    .object({ role: z.enum(["CANDIDATE", "RECRUITER", "ADMIN"]).optional(), blocked: z.boolean().optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  // Admins may demote themselves — explicitly allowed by the spec.
  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ id: user.id, role: user.role, blocked: user.blocked });
});

usersRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  // Profile data, values, projects, CVs, likes, comments go via DB cascade.
  await prisma.user.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});
