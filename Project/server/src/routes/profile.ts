import { Request, Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { isAdmin, isRecruiter, requireAuth } from "../auth";
import { accessiblePositionIds } from "../access";

export const profileRouter = Router();
export const tagsRouter = Router();

function canEditProfile(req: Request, userId: string) {
  return req.user!.id === userId || isAdmin(req);
}

/**
 * Full profile: built-in "Me" values, library attribute values, projects, CVs.
 * Owner & admin get everything; recruiters get a read-only public view.
 */
profileRouter.get("/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params;
  const owner = canEditProfile(req, userId);
  if (!owner && !isRecruiter(req)) return res.status(403).json({ error: "forbidden" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "not_found" });

  const values = await prisma.attributeValue.findMany({
    where: { userId },
    include: { attribute: { include: { category: true } } },
    orderBy: { attribute: { name: "asc" } },
  });
  const builtIns = await prisma.attribute.findMany({ where: { builtIn: true }, orderBy: { createdAt: "asc" } });
  const projects = await prisma.project.findMany({
    where: { userId },
    include: { tags: { include: { tag: true } } },
    orderBy: { startDate: "desc" },
  });
  const cvs = await prisma.cv.findMany({
    where: { userId, ...(owner ? {} : { status: "PUBLISHED" }) },
    include: { position: { select: { id: true, title: true, company: true, isPublic: true } }, _count: { select: { likes: true } } },
    orderBy: { updatedAt: "desc" },
  });
  // CVs whose position access was lost are hidden (not deleted).
  const accessible = await accessiblePositionIds(userId, cvs.map((c) => c.position));
  res.json({
    user,
    editable: owner,
    builtIns,
    values,
    projects,
    cvs: cvs.filter((c) => accessible.has(c.position.id)),
  });
});

/** Adds a library attribute to the profile (creates an empty value). */
profileRouter.post("/:userId/attributes", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  const parsed = z.object({ attributeId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const value = await prisma.attributeValue.upsert({
    where: { userId_attributeId: { userId: req.params.userId, attributeId: parsed.data.attributeId } },
    update: {},
    create: { userId: req.params.userId, attributeId: parsed.data.attributeId },
    include: { attribute: { include: { category: true } } },
  });
  res.json(value);
});

profileRouter.delete("/:userId/attributes/:attributeId", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  const attr = await prisma.attribute.findUnique({ where: { id: req.params.attributeId } });
  if (attr?.builtIn) return res.status(403).json({ error: "built_in" });
  await prisma.attributeValue.deleteMany({
    where: { userId: req.params.userId, attributeId: req.params.attributeId },
  });
  res.json({ ok: true });
});

/**
 * Batch auto-save of attribute values with per-value optimistic locking.
 * `version: null` means the value did not exist on the client yet (insert).
 * Response reports the new version for saved items and flags conflicts —
 * the client reloads conflicting values and shows a message.
 */
const saveSchema = z.object({
  values: z.array(
    z.object({ attributeId: z.string(), value: z.string().max(10000), version: z.number().int().nullable() })
  ),
});

profileRouter.patch("/:userId/values", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { userId } = req.params;

  const attributes = await prisma.attribute.findMany({
    where: { id: { in: parsed.data.values.map((v) => v.attributeId) } },
  });
  const typeOf = new Map(attributes.map((a) => [a.id, a.type]));

  const results: { attributeId: string; version?: number; conflict?: boolean; current?: string }[] = [];
  for (const item of parsed.data.values) {
    const valueNum = typeOf.get(item.attributeId) === "NUMERIC" ? parseFloat(item.value) || null : null;
    if (item.version === null) {
      const created = await prisma.attributeValue.upsert({
        where: { userId_attributeId: { userId, attributeId: item.attributeId } },
        update: { value: item.value, valueNum, version: { increment: 1 } },
        create: { userId, attributeId: item.attributeId, value: item.value, valueNum },
      });
      results.push({ attributeId: item.attributeId, version: created.version });
    } else {
      const { count } = await prisma.attributeValue.updateMany({
        where: { userId, attributeId: item.attributeId, version: item.version },
        data: { value: item.value, valueNum, version: { increment: 1 } },
      });
      if (count === 0) {
        const current = await prisma.attributeValue.findUnique({
          where: { userId_attributeId: { userId, attributeId: item.attributeId } },
        });
        results.push({ attributeId: item.attributeId, conflict: true, current: current?.value, version: current?.version });
      } else {
        results.push({ attributeId: item.attributeId, version: item.version + 1 });
      }
    }
  }
  res.json({ results });
});

// ---------- Projects ----------
const projectSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string().nullable().default(null),
  description: z.string().max(10000).default(""),
  tags: z.array(z.string().min(1)).default([]),
});

async function ensureTags(names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  await prisma.tag.createMany({ data: unique.map((name) => ({ name })), skipDuplicates: true });
  return (await prisma.tag.findMany({ where: { name: { in: unique } } })).map((t) => ({ tagId: t.id }));
}

profileRouter.post("/:userId/projects", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { tags, startDate, endDate, ...fields } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...fields,
      userId: req.params.userId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      tags: { create: await ensureTags(tags) },
    },
    include: { tags: { include: { tag: true } } },
  });
  res.json(project);
});

profileRouter.patch("/:userId/projects/:projectId", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  const parsed = projectSchema.extend({ version: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { tags, version, startDate, endDate, ...fields } = parsed.data;

  const { count } = await prisma.project.updateMany({
    where: { id: req.params.projectId, userId: req.params.userId, version },
    data: {
      ...fields,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      version: { increment: 1 },
    },
  });
  if (count === 0) return res.status(409).json({ error: "version_conflict" });

  const tagLinks = await ensureTags(tags);
  await prisma.$transaction([
    prisma.projectTag.deleteMany({ where: { projectId: req.params.projectId } }),
    prisma.projectTag.createMany({ data: tagLinks.map((t) => ({ ...t, projectId: req.params.projectId })) }),
  ]);
  res.json(
    await prisma.project.findUnique({ where: { id: req.params.projectId }, include: { tags: { include: { tag: true } } } })
  );
});

profileRouter.delete("/:userId/projects/:projectId", requireAuth, async (req, res) => {
  if (!canEditProfile(req, req.params.userId)) return res.status(403).json({ error: "forbidden" });
  await prisma.project.deleteMany({ where: { id: req.params.projectId, userId: req.params.userId } });
  res.json({ ok: true });
});

// ---------- Tags (autocomplete) ----------
tagsRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const tags = await prisma.tag.findMany({
    where: q ? { name: { startsWith: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
  });
  res.json(tags);
});
