import { Request, Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
  const items = parsed.data.values;
  const attributeIds = items.map((v) => v.attributeId);

  const [attributes, existingRows] = await Promise.all([
    prisma.attribute.findMany({ where: { id: { in: attributeIds } }, select: { id: true, type: true } }),
    prisma.attributeValue.findMany({ where: { userId, attributeId: { in: attributeIds } } }),
  ]);
  const typeOf = new Map(attributes.map((a) => [a.id, a.type]));
  const existing = new Map(existingRows.map((r) => [r.attributeId, r]));

  // Classify in memory only — no queries inside this loop. Writes are then
  // executed as two set-based statements (one INSERT, one UPDATE) below.
  type Pending = { attributeId: string; value: string; valueNum: number | null; expectedVersion: number };
  const inserts: Prisma.AttributeValueCreateManyInput[] = [];
  const updates: Pending[] = [];
  const results: { attributeId: string; version?: number; conflict?: boolean; current?: string }[] = [];

  for (const item of items) {
    const valueNum = typeOf.get(item.attributeId) === "NUMERIC" ? parseFloat(item.value) || null : null;
    const row = existing.get(item.attributeId);
    if (!row) {
      if (item.version === null) {
        inserts.push({ userId, attributeId: item.attributeId, value: item.value, valueNum });
      } else {
        // Client knew a version but the row is gone (attribute value deleted concurrently).
        results.push({ attributeId: item.attributeId, conflict: true });
      }
    } else if (item.version !== null && item.version !== row.version) {
      // Stale client version: report the conflict straight from the batch read.
      results.push({ attributeId: item.attributeId, conflict: true, current: row.value, version: row.version });
    } else {
      updates.push({ attributeId: item.attributeId, value: item.value, valueNum, expectedVersion: row.version });
    }
  }

  if (inserts.length > 0) {
    await prisma.attributeValue.createMany({ data: inserts, skipDuplicates: true });
    for (const ins of inserts) results.push({ attributeId: ins.attributeId, version: 1 });
  }

  if (updates.length > 0) {
    // Single set-based UPDATE for the whole batch; the version guard in the
    // WHERE clause preserves optimistic locking per row.
    const rows = updates.map(
      (u) => Prisma.sql`(${u.attributeId}::text, ${u.value}::text, ${u.valueNum}::float8, ${u.expectedVersion}::int)`
    );
    const updated = await prisma.$queryRaw<{ attributeId: string; version: number }[]>(Prisma.sql`
      UPDATE "AttributeValue" AS av
      SET "value" = v."value", "valueNum" = v."valueNum", "version" = av."version" + 1, "updatedAt" = now()
      FROM (VALUES ${Prisma.join(rows)}) AS v("attributeId", "value", "valueNum", "version")
      WHERE av."userId" = ${userId} AND av."attributeId" = v."attributeId" AND av."version" = v."version"
      RETURNING av."attributeId", av."version"
    `);
    const newVersions = new Map(updated.map((r) => [r.attributeId, r.version]));

    // Rows that raced between our read and the update: fetch their current
    // state in one extra query (only when a conflict actually happened).
    const raced = updates.filter((u) => !newVersions.has(u.attributeId));
    const racedRows = raced.length
      ? await prisma.attributeValue.findMany({
          where: { userId, attributeId: { in: raced.map((u) => u.attributeId) } },
        })
      : [];
    const racedById = new Map(racedRows.map((r) => [r.attributeId, r]));

    for (const u of updates) {
      const version = newVersions.get(u.attributeId);
      if (version !== undefined) {
        results.push({ attributeId: u.attributeId, version });
      } else {
        const current = racedById.get(u.attributeId);
        results.push({ attributeId: u.attributeId, conflict: true, current: current?.value, version: current?.version });
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
