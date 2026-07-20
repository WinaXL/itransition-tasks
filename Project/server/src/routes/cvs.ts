import { Request, Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { isAdmin, isRecruiter, requireAuth, requireRole } from "../auth";
import { canAccessPosition } from "../access";

export const cvsRouter = Router();

cvsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = z.object({ positionId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { positionId } = parsed.data;
  if (!(await canAccessPosition(req.user!.id, positionId)) && !isAdmin(req))
    return res.status(403).json({ error: "no_access" });
  const cv = await prisma.cv.upsert({
    where: { userId_positionId: { userId: req.user!.id, positionId } },
    update: {},
    create: { userId: req.user!.id, positionId },
  });
  res.json(cv);
});

/**
 * Assembled CV. Nothing is copied: attribute values are looked up from the
 * profile and projects are filtered by the position's tags at read time.
 */
cvsRouter.get("/:id", requireAuth, async (req, res) => {
  const cv = await prisma.cv.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      position: {
        include: {
          attributes: { include: { attribute: { include: { category: true } } }, orderBy: { sortOrder: "asc" } },
          projectTags: { include: { tag: true } },
        },
      },
      likes: true,
    },
  });
  if (!cv) return res.status(404).json({ error: "not_found" });

  const owner = cv.userId === req.user!.id || isAdmin(req);
  if (!owner && !isRecruiter(req)) return res.status(403).json({ error: "forbidden" });
  if (!owner && cv.status !== "PUBLISHED") return res.status(403).json({ error: "not_published" });
  // A CV whose position access was lost is hidden from everyone but admins.
  if (!isAdmin(req) && !(await canAccessPosition(cv.userId, cv.positionId)))
    return res.status(404).json({ error: "hidden" });

  const builtIns = await prisma.attribute.findMany({ where: { builtIn: true }, orderBy: { createdAt: "asc" } });
  const positionAttrs = cv.position.attributes.map((pa) => pa.attribute);
  const positionAttrIds = new Set(positionAttrs.map((a) => a.id));
  const shownAttrs = [...builtIns, ...positionAttrs.filter((a) => !a.builtIn)];

  const values = await prisma.attributeValue.findMany({
    where: { userId: cv.userId, attributeId: { in: shownAttrs.map((a) => a.id) } },
  });
  const valueMap = new Map(values.map((v) => [v.attributeId, v]));

  const tagNames = cv.position.projectTags.map((t) => t.tag.name);
  const projects = await prisma.project.findMany({
    where: {
      userId: cv.userId,
      ...(tagNames.length ? { tags: { some: { tag: { name: { in: tagNames } } } } } : {}),
    },
    include: { tags: { include: { tag: true } } },
    orderBy: { startDate: "desc" },
    take: cv.position.maxProjects,
  });

  res.json({
    id: cv.id,
    status: cv.status,
    version: cv.version,
    updatedAt: cv.updatedAt,
    user: cv.user,
    position: {
      id: cv.position.id,
      title: cv.position.title,
      company: cv.position.company,
      level: cv.position.level,
      shortDescription: cv.position.shortDescription,
    },
    editable: owner,
    likes: cv.likes.length,
    likedByMe: cv.likes.some((l) => l.userId === req.user!.id),
    sections: shownAttrs.map((a) => {
      const v = valueMap.get(a.id);
      return {
        attribute: a,
        value: v?.value ?? "",
        version: v?.version ?? null,
        category: (a as { category?: { name: string } }).category?.name ?? "Personal Information",
        // Only position-template attributes block publishing (mirrors /publish).
        required: positionAttrIds.has(a.id),
      };
    }),
    projects,
  });
});

/** Publish is allowed only when every position attribute is filled. */
cvsRouter.post("/:id/publish", requireAuth, async (req, res) => {
  const cv = await prisma.cv.findUnique({
    where: { id: req.params.id },
    include: { position: { include: { attributes: true } } },
  });
  if (!cv) return res.status(404).json({ error: "not_found" });
  if (cv.userId !== req.user!.id && !isAdmin(req)) return res.status(403).json({ error: "forbidden" });

  const required = cv.position.attributes.map((a) => a.attributeId);
  const filled = await prisma.attributeValue.count({
    where: { userId: cv.userId, attributeId: { in: required }, value: { not: "" } },
  });
  if (filled < required.length)
    return res.status(400).json({ error: "incomplete", missing: required.length - filled });

  res.json(await prisma.cv.update({ where: { id: cv.id }, data: { status: "PUBLISHED" } }));
});

cvsRouter.post("/:id/unpublish", requireAuth, async (req, res) => {
  const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
  if (!cv) return res.status(404).json({ error: "not_found" });
  if (cv.userId !== req.user!.id && !isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  res.json(await prisma.cv.update({ where: { id: cv.id }, data: { status: "DRAFT" } }));
});

cvsRouter.delete("/:id", requireAuth, async (req, res) => {
  const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
  if (!cv) return res.status(404).json({ error: "not_found" });
  if (cv.userId !== req.user!.id && !isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  await prisma.cv.delete({ where: { id: cv.id } });
  res.json({ ok: true });
});

// ---------- Likes (Recruiters only, one per CV) ----------
cvsRouter.post("/:id/like", requireRole("RECRUITER"), async (req, res) => {
  await prisma.like.upsert({
    where: { cvId_userId: { cvId: req.params.id, userId: req.user!.id } },
    update: {},
    create: { cvId: req.params.id, userId: req.user!.id },
  });
  res.json({ likes: await prisma.like.count({ where: { cvId: req.params.id } }), likedByMe: true });
});

cvsRouter.delete("/:id/like", requireRole("RECRUITER"), async (req, res) => {
  await prisma.like.deleteMany({ where: { cvId: req.params.id, userId: req.user!.id } });
  res.json({ likes: await prisma.like.count({ where: { cvId: req.params.id } }), likedByMe: false });
});
