import { AccessRule, Attribute, AttributeValue } from "@prisma/client";
import { prisma } from "./prisma";

type RuleWithAttribute = AccessRule & { attribute: Attribute };

/** Evaluates one rule against the candidate's master value (undefined = not filled). */
function ruleMatches(rule: RuleWithAttribute, value: AttributeValue | undefined): boolean {
  const raw = value?.value ?? "";
  switch (rule.operator) {
    case "checked":
      return raw === "true";
    case "unchecked":
      return raw !== "true";
    case "eq":
      return raw === rule.value;
    case "neq":
      return raw !== rule.value;
    case "contains":
      return raw.toLowerCase().includes(rule.value.toLowerCase());
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = rule.attribute.type === "DATE" ? Date.parse(raw) : value?.valueNum ?? NaN;
      const b = rule.attribute.type === "DATE" ? Date.parse(rule.value) : Number(rule.value);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return rule.operator === "gt" ? a > b : rule.operator === "gte" ? a >= b : rule.operator === "lt" ? a < b : a <= b;
    }
    default:
      return false;
  }
}

/**
 * A position is accessible when it is public or when ALL its access rules
 * match the candidate's profile values. Values for every rule are fetched
 * in a single query (no queries in loops).
 */
export async function accessiblePositionIds(userId: string, positions: { id: string; isPublic: boolean }[]) {
  const restricted = positions.filter((p) => !p.isPublic);
  const result = new Set(positions.filter((p) => p.isPublic).map((p) => p.id));
  if (restricted.length === 0) return result;

  const rules = await prisma.accessRule.findMany({
    where: { positionId: { in: restricted.map((p) => p.id) } },
    include: { attribute: true },
  });
  const values = await prisma.attributeValue.findMany({
    where: { userId, attributeId: { in: [...new Set(rules.map((r) => r.attributeId))] } },
  });
  const valueByAttr = new Map(values.map((v) => [v.attributeId, v]));

  for (const p of restricted) {
    const own = rules.filter((r) => r.positionId === p.id);
    if (own.length > 0 && own.every((r) => ruleMatches(r, valueByAttr.get(r.attributeId)))) result.add(p.id);
  }
  return result;
}

export async function canAccessPosition(userId: string, positionId: string) {
  const position = await prisma.position.findUnique({ where: { id: positionId }, select: { id: true, isPublic: true } });
  if (!position) return false;
  const ids = await accessiblePositionIds(userId, [position]);
  return ids.has(positionId);
}
