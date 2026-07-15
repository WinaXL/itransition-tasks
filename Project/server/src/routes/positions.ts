import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { isRecruiter, requireAuth, requireRole } from "../auth";
import { updateVersioned, CONFLICT } from "../lock";
import { accessiblePositionIds } from "../access";
import { Position } from "@prisma/client";

export const positionsRouter = Router();

const includeAll = {
  attributes: { include: { attribute: { include: { category: true } } }, orderBy: { sortOrder: "asc" as const } },
  projectTags: { include: { tag: true } },
  accessRules: { include: { attribute: true } },
  _count: { select: { cvs: true, comments: true } },
};

// Anonymous users may browse positions read-only.
positionsRouter.get("/", async (req, res) => {
  const { q, level, sort } = req.query;
  const positions = await prisma.position.findMany({
    where: q
      ? { OR: [{ title: { contains: String(q), mode: "insensitive" } }, { company: { contains: String(q), mode: "insensitive" } }] }
      : undefined,
    ...(level ? { where: { level: String(level) } } : {}),
    include: { _count: { select: { cvs: true } } },
    orderBy: sort === "cvs" ? { cvs: { _count: "desc" } } : { updatedAt: "desc" },
  });
  const accessible =
    req.user && req.user.role === "CANDIDATE"
      ? await accessiblePositionIds(req.user.id, positions)
      : new Set(positions.map((p) => p.id)); // recruiters/admins/anon see the whole catalogue
  res.json(
    positions.map((p) => ({
      ...p,
      cvCount: p._count.cvs,
      accessible: req.user ? accessible.has(p.id) : false,
    }))
  );
});

positionsRouter.get("/:id", async (req, res) => {
  const position = await prisma.position.findUnique({ where: { id: req.params.id }, include: includeAll });
  if (!position) return res.status(404).json({ error: "not_found" });
  let accessible = false;
  let myCvId: string | null = null;
  if (req.user) {
    accessible = isRecruiter(req) || (await accessiblePositionIds(req.user.id, [position])).has(position.id);
    const cv = await prisma.cv.findUnique({
      where: { userId_positionId: { userId: req.user.id, positionId: position.id } },
      select: { id: true },
    });
    myCvId = cv?.id ?? null;
  }
  res.json({ ...position, accessible, myCvId, canEdit: isRecruiter(req) });
});

const positionSchema = z.object({
  title: z.string().min(1).max(200),
  shortDescription: z.string().max(2000).default(""),
  company: z.string().max(200).default(""),
  level: z.string().max(50).default(""),
  isPublic: z.boolean().default(true),
  maxProjects: z.number().int().min(0).max(20).default(3),
  attributeIds: z.array(z.string()).default([]),
  projectTags: z.array(z.string().min(1)).default([]),
  accessRules: z
    .array(z.object({ attributeId: z.string(), operator: z.string(), value: z.string().default("") }))
    .default([]),
});

async function tagIds(names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  // Tags are created on first use.
  await prisma.tag.createMany({ data: unique.map((name) => ({ name })), skipDuplicates: true });
  return (await prisma.tag.findMany({ where: { name: { in: unique } } })).map((t) => t.id);
}

async function replaceRelations(positionId: string, data: z.infer<typeof positionSchema>) {
  const ids = await tagIds(data.projectTags);
  await prisma.$transaction([
    prisma.positionAttribute.deleteMany({ where: { positionId } }),
    prisma.positionAttribute.createMany({
      data: data.attributeIds.map((attributeId, i) => ({ positionId, attributeId, sortOrder: i })),
    }),
    prisma.positionTag.deleteMany({ where: { positionId } }),
    prisma.positionTag.createMany({ data: ids.map((tagId) => ({ positionId, tagId })) }),
    prisma.accessRule.deleteMany({ where: { positionId } }),
    prisma.accessRule.createMany({ data: data.accessRules.map((r) => ({ ...r, positionId })) }),
  ]);
}

positionsRouter.post("/", requireRole("RECRUITER"), async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { attributeIds, projectTags, accessRules, ...fields } = parsed.data;
  const position = await prisma.position.create({ data: { ...fields, createdById: req.user!.id } });
  await replaceRelations(position.id, parsed.data);
  res.json(await prisma.position.findUnique({ where: { id: position.id }, include: includeAll }));
});

positionsRouter.post("/:id/duplicate", requireRole("RECRUITER"), async (req, res) => {
  const src = await prisma.position.findUnique({ where: { id: req.params.id }, include: includeAll });
  if (!src) return res.status(404).json({ error: "not_found" });
  const copy = await prisma.position.create({
    data: {
      title: `${src.title} (copy)`,
      shortDescription: src.shortDescription,
      company: src.company,
      level: src.level,
      isPublic: src.isPublic,
      maxProjects: src.maxProjects,
      createdById: req.user!.id,
      attributes: { create: src.attributes.map((a) => ({ attributeId: a.attributeId, sortOrder: a.sortOrder })) },
      projectTags: { create: src.projectTags.map((t) => ({ tagId: t.tagId })) },
      accessRules: {
        create: src.accessRules.map((r) => ({ attributeId: r.attributeId, operator: r.operator, value: r.value })),
      },
    },
  });
  res.json(await prisma.position.findUnique({ where: { id: copy.id }, include: includeAll }));
});

positionsRouter.patch("/:id", requireRole("RECRUITER"), async (req, res) => {
  const parsed = positionSchema.extend({ version: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { version, attributeIds, projectTags, accessRules, ...fields } = parsed.data;
  const updated = await updateVersioned<Position>(prisma.position, req.params.id, version, fields);
  if (!updated) return res.status(409).json(CONFLICT);
  await replaceRelations(req.params.id, parsed.data);
  res.json(await prisma.position.findUnique({ where: { id: req.params.id }, include: includeAll }));
});

positionsRouter.delete("/:id", requireRole("RECRUITER"), async (req, res) => {
  // CVs, comments, rules and links are removed by DB cascade.
  await prisma.position.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// ---------- CVs of a position (structured table for Recruiters/Admins) ----------
positionsRouter.get("/:id/cvs", requireRole("RECRUITER"), async (req, res) => {
  const position = await prisma.position.findUnique({
    where: { id: req.params.id },
    include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!position) return res.status(404).json({ error: "not_found" });

  const cvs = await prisma.cv.findMany({
    where: { positionId: position.id, status: "PUBLISHED" },
    include: { user: { select: { id: true, name: true } }, _count: { select: { likes: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const attributeIds = position.attributes.map((a) => a.attributeId);
  const values = await prisma.attributeValue.findMany({
    where: { userId: { in: cvs.map((c) => c.userId) }, attributeId: { in: attributeIds } },
  });
  const key = (userId: string, attributeId: string) => `${userId}:${attributeId}`;
  const valueMap = new Map(values.map((v) => [key(v.userId, v.attributeId), v]));

  // Aggregates for numeric columns (avg over filled values).
  const averages: Record<string, number | null> = {};
  for (const pa of position.attributes) {
    if (pa.attribute.type !== "NUMERIC") continue;
    const nums = cvs
      .map((c) => valueMap.get(key(c.userId, pa.attributeId))?.valueNum)
      .filter((n): n is number => typeof n === "number");
    averages[pa.attributeId] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }

  res.json({
    columns: position.attributes.map((a) => a.attribute),
    averages,
    rows: cvs.map((cv) => ({
      cvId: cv.id,
      userId: cv.user.id,
      userName: cv.user.name,
      likes: cv._count.likes,
      updatedAt: cv.updatedAt,
      values: Object.fromEntries(
        attributeIds.map((attrId) => [attrId, valueMap.get(key(cv.userId, attrId))?.value ?? ""])
      ),
    })),
  });
});

// CSV export of the same table (optional requirement).
positionsRouter.get("/:id/cvs.csv", requireRole("RECRUITER"), async (req, res) => {
  const position = await prisma.position.findUnique({
    where: { id: req.params.id },
    include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!position) return res.status(404).json({ error: "not_found" });
  const cvs = await prisma.cv.findMany({
    where: { positionId: position.id, status: "PUBLISHED" },
    include: { user: { select: { name: true } } },
  });
  const values = await prisma.attributeValue.findMany({
    where: {
      userId: { in: cvs.map((c) => c.userId) },
      attributeId: { in: position.attributes.map((a) => a.attributeId) },
    },
  });
  const valueMap = new Map(values.map((v) => [`${v.userId}:${v.attributeId}`, v.value]));
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["Candidate", ...position.attributes.map((a) => a.attribute.name)].map(esc).join(",");
  const lines = cvs.map((cv) =>
    [cv.user.name, ...position.attributes.map((a) => valueMap.get(`${cv.userId}:${a.attributeId}`) ?? "")]
      .map(esc)
      .join(",")
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="cvs-${position.id}.csv"`);
  res.send([header, ...lines].join("\n"));
});

// ---------- Discussion (clients poll every few seconds) ----------
positionsRouter.get("/:id/comments", async (req, res) => {
  const after = req.query.after ? new Date(String(req.query.after)) : undefined;
  const comments = await prisma.comment.findMany({
    where: { positionId: req.params.id, ...(after ? { createdAt: { gt: after } } : {}) },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(comments);
});

positionsRouter.post("/:id/comments", requireAuth, async (req, res) => {
  const parsed = z.object({ text: z.string().min(1).max(5000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const comment = await prisma.comment.create({
    data: { positionId: req.params.id, authorId: req.user!.id, text: parsed.data.text },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json(comment);
});
