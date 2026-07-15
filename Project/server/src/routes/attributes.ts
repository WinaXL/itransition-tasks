import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { updateVersioned, CONFLICT } from "../lock";
import { Attribute } from "@prisma/client";

export const attributesRouter = Router();

attributesRouter.get("/categories", async (_req, res) => {
  res.json(await prisma.attributeCategory.findMany({ orderBy: { name: "asc" } }));
});

/**
 * Library lookup: ?prefix= (name prefix), ?category= (id), ?recent=1
 * (attributes the current user filled most recently).
 */
attributesRouter.get("/", requireAuth, async (req, res) => {
  const { prefix, category, recent } = req.query;
  if (recent) {
    const values = await prisma.attributeValue.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { attribute: { include: { category: true } } },
    });
    return res.json(values.map((v) => v.attribute));
  }
  const attributes = await prisma.attribute.findMany({
    where: {
      ...(prefix ? { name: { startsWith: String(prefix), mode: "insensitive" } } : {}),
      ...(category ? { categoryId: Number(category) } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  res.json(attributes);
});

const attrSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  type: z.enum(["STRING", "TEXT", "IMAGE", "NUMERIC", "DATE", "PERIOD", "BOOLEAN", "SELECT"]),
  options: z.array(z.string().min(1)).default([]),
  categoryId: z.number().int(),
});

attributesRouter.post("/", requireRole("RECRUITER"), async (req, res) => {
  const parsed = attrSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  if (await prisma.attribute.findUnique({ where: { name: parsed.data.name } }))
    return res.status(409).json({ error: "name_taken" });
  res.json(await prisma.attribute.create({ data: parsed.data, include: { category: true } }));
});

attributesRouter.patch("/:id", requireRole("RECRUITER"), async (req, res) => {
  const parsed = attrSchema.partial().extend({ version: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { version, ...data } = parsed.data;

  const existing = await prisma.attribute.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  // Built-in attributes keep their identity; changing the type would orphan stored values.
  if (existing.builtIn) delete (data as Record<string, unknown>).name;
  delete (data as Record<string, unknown>).type;
  if (data.name && data.name !== existing.name) {
    if (await prisma.attribute.findUnique({ where: { name: data.name } }))
      return res.status(409).json({ error: "name_taken" });
  }

  const updated = await updateVersioned<Attribute>(prisma.attribute, req.params.id, version, data);
  if (!updated) return res.status(409).json(CONFLICT);
  res.json(await prisma.attribute.findUnique({ where: { id: updated.id }, include: { category: true } }));
});

attributesRouter.delete("/:id", requireRole("RECRUITER"), async (req, res) => {
  const existing = await prisma.attribute.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (existing.builtIn) return res.status(403).json({ error: "built_in" });
  // Values, position links and access rules are removed by DB cascade.
  await prisma.attribute.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
