import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isRecruiter, requireRole } from "../auth";

export const searchRouter = Router();
export const homeRouter = Router();
export const usersRouter = Router();

/**
 * Full-text search (header search box) built on PostgreSQL's native engine:
 * to_tsvector / websearch_to_tsquery with a relevance ranking.
 */
searchRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ positions: [], attributes: [], cvs: [] });

  const positions = await prisma.$queryRaw<
    { id: string; title: string; company: string; shortdescription: string; rank: number }[]
  >(Prisma.sql`
    SELECT id, title, company, "shortDescription" AS shortdescription,
           ts_rank(to_tsvector('simple', title || ' ' || company || ' ' || "shortDescription"),
                   websearch_to_tsquery('simple', ${q})) AS rank
    FROM "Position"
    WHERE to_tsvector('simple', title || ' ' || company || ' ' || "shortDescription")
          @@ websearch_to_tsquery('simple', ${q})
    ORDER BY rank DESC LIMIT 20`);

  let attributes: unknown[] = [];
  let cvs: unknown[] = [];
  if (req.user) {
    attributes = await prisma.$queryRaw(Prisma.sql`
      SELECT id, name, description
      FROM "Attribute"
      WHERE to_tsvector('simple', name || ' ' || description) @@ websearch_to_tsquery('simple', ${q})
      LIMIT 20`);
  }
  if (isRecruiter(req)) {
    // Published CVs matched by candidate name, attribute values or project text.
    cvs = await prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT c.id, u.name AS "userName", p.title AS "positionTitle",
             (SELECT COUNT(*)::int FROM "Like" l WHERE l."cvId" = c.id) AS likes
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
      LIMIT 20`);
  }
  res.json({ positions, attributes, cvs });
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

// ---------- Admin: user management ----------
usersRouter.get("/", requireRole("ADMIN"), async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, blocked: true, provider: true, createdAt: true,
        _count: { select: { cvs: true, projects: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  );
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
