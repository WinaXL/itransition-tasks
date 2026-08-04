import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { isAdmin, requireAuth } from "../auth";

/* ============================================================
 * 1. SALESFORCE — "Sync to CRM" action on the profile page.
 *    Creates (or updates) an Account with a linked Contact via
 *    the Salesforce REST API using the OAuth2 client-credentials
 *    flow of a Connected App.
 * ============================================================ */

export const salesforceRouter = Router();

const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
const SF_API_VERSION = "v61.0";

const sfConfigured = () => Boolean(process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET);

// Access tokens are cached until Salesforce rejects them (then re-fetched once).
let sfSession: { accessToken: string; instanceUrl: string } | null = null;

async function sfLogin(): Promise<{ accessToken: string; instanceUrl: string }> {
  const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SF_CLIENT_ID!,
      client_secret: process.env.SF_CLIENT_SECRET!,
    }),
  });
  const data = (await res.json()) as { access_token?: string; instance_url?: string; error_description?: string };
  if (!res.ok || !data.access_token || !data.instance_url) {
    throw new Error(data.error_description || "salesforce_auth_failed");
  }
  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

/** Calls a Salesforce REST resource, re-authenticating once on 401. */
async function sfRequest(method: string, path: string, body?: unknown): Promise<Response> {
  if (!sfSession) sfSession = await sfLogin();
  const doCall = () =>
    fetch(`${sfSession!.instanceUrl}/services/data/${SF_API_VERSION}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${sfSession!.accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  let res = await doCall();
  if (res.status === 401) {
    sfSession = await sfLogin();
    res = await doCall();
  }
  return res;
}

async function sfErrorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { message?: string }[] | null;
  return data?.[0]?.message || `salesforce_http_${res.status}`;
}

const crmSchema = z.object({
  company: z.string().max(255).default(""),
  phone: z.string().max(40).default(""),
  jobTitle: z.string().max(128).default(""),
  industry: z.string().max(128).default(""),
  website: z.string().max(255).default(""),
  notes: z.string().max(2000).default(""),
});

/**
 * Creates an Account + linked Contact for the profile owner. The Contact is
 * filled from the non-removable profile fields (name, email, built-in "Me"
 * attributes); the Account gets the extra data entered in the form.
 * Subsequent syncs update the same records instead of duplicating them.
 */
salesforceRouter.post("/:userId/sync", requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId && !isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  if (!sfConfigured()) return res.status(503).json({ error: "not_configured" });
  const parsed = crmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const form = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "not_found" });

  // Non-removable built-in "Me" attributes feed the Contact record.
  const builtInValues = await prisma.attributeValue.findMany({
    where: { userId, attribute: { builtIn: true } },
    include: { attribute: { select: { name: true } } },
  });
  const builtIn = new Map(builtInValues.map((v) => [v.attribute.name, v.value]));
  const firstName = builtIn.get("First Name") || user.name.split(" ")[0] || user.name;
  const lastName = builtIn.get("Last Name") || user.name.split(" ").slice(1).join(" ") || user.name;
  const city = builtIn.get("Location") || "";

  const account = {
    Name: form.company || `${user.name} (CVForge)`,
    Phone: form.phone || undefined,
    Website: form.website || undefined,
    Industry: form.industry || undefined,
    BillingCity: city || undefined,
    Description: [form.notes, `Imported from CVForge (user ${user.email}, role ${user.role}).`]
      .filter(Boolean)
      .join("\n"),
  };
  const contact = {
    FirstName: firstName,
    LastName: lastName,
    Email: user.email,
    Phone: form.phone || undefined,
    Title: form.jobTitle || undefined,
    MailingCity: city || undefined,
    Description: `CVForge role: ${user.role}`,
  };

  try {
    let accountId = user.sfAccountId;
    let contactId = user.sfContactId;
    const updated = Boolean(accountId && contactId);

    if (accountId && contactId) {
      const accRes = await sfRequest("PATCH", `/sobjects/Account/${accountId}`, account);
      if (!accRes.ok) return res.status(502).json({ error: await sfErrorMessage(accRes) });
      const conRes = await sfRequest("PATCH", `/sobjects/Contact/${contactId}`, { ...contact, AccountId: accountId });
      if (!conRes.ok) return res.status(502).json({ error: await sfErrorMessage(conRes) });
    } else {
      const accRes = await sfRequest("POST", "/sobjects/Account", account);
      if (!accRes.ok) return res.status(502).json({ error: await sfErrorMessage(accRes) });
      accountId = ((await accRes.json()) as { id: string }).id;

      const conRes = await sfRequest("POST", "/sobjects/Contact", { ...contact, AccountId: accountId });
      if (!conRes.ok) return res.status(502).json({ error: await sfErrorMessage(conRes) });
      contactId = ((await conRes.json()) as { id: string }).id;

      await prisma.user.update({ where: { id: userId }, data: { sfAccountId: accountId, sfContactId: contactId } });
    }

    res.json({ accountId, contactId, updated });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "salesforce_failed" });
  }
});

/* ============================================================
 * 2. EXTERNAL AGGREGATES API — consumed by the Odoo addon.
 *    Access is granted by a per-position api token; only data
 *    from the corresponding position is accessible.
 * ============================================================ */

export const externalRouter = Router();

externalRouter.get("/position", async (req, res) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const token = String(req.query.token || bearer || "");
  if (!token) return res.status(401).json({ error: "token_required" });

  const position = await prisma.position.findUnique({
    where: { apiToken: token },
    include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!position) return res.status(401).json({ error: "invalid_token" });

  const cvs = await prisma.cv.findMany({
    where: { positionId: position.id, status: "PUBLISHED" },
    select: { userId: true },
  });
  const attributeIds = position.attributes.map((a) => a.attributeId);
  const values = await prisma.attributeValue.findMany({
    where: { userId: { in: cvs.map((c) => c.userId) }, attributeId: { in: attributeIds } },
  });
  const byAttribute = new Map<string, { value: string; valueNum: number | null }[]>();
  for (const v of values) {
    if (!v.value) continue;
    const list = byAttribute.get(v.attributeId) ?? [];
    list.push({ value: v.value, valueNum: v.valueNum });
    byAttribute.set(v.attributeId, list);
  }

  const attributes = position.attributes.map((pa) => {
    const filled = byAttribute.get(pa.attributeId) ?? [];
    const base = { name: pa.attribute.name, type: pa.attribute.type, count: filled.length };
    if (pa.attribute.type === "NUMERIC") {
      const nums = filled.map((v) => v.valueNum).filter((n): n is number => typeof n === "number");
      return {
        ...base,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
        popular: [],
      };
    }
    // Text-like attributes: a few most popular values.
    const counts = new Map<string, number>();
    for (const v of filled) counts.set(v.value, (counts.get(v.value) ?? 0) + 1);
    const popular = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value: value.length > 120 ? `${value.slice(0, 120)}…` : value, count }));
    return { ...base, average: null, min: null, max: null, popular };
  });

  res.json({
    position: {
      id: position.id,
      title: position.title,
      company: position.company,
      level: position.level,
      cvCount: cvs.length,
    },
    attributes,
    exportedAt: new Date().toISOString(),
  });
});

/* ============================================================
 * 3. POWER AUTOMATE — support tickets uploaded to Dropbox.
 *    A cloud flow watches the folder, e-mails the admins and
 *    pushes a mobile notification.
 * ============================================================ */

export const supportRouter = Router();

const dropboxConfigured = () =>
  Boolean(
    process.env.DROPBOX_ACCESS_TOKEN ||
      (process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET && process.env.DROPBOX_REFRESH_TOKEN)
  );

// Short-lived access token obtained from the permanent refresh token.
let dropboxToken: { value: string; expiresAt: number } | null = null;

async function getDropboxToken(): Promise<string> {
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    if (dropboxToken && dropboxToken.expiresAt > Date.now()) return dropboxToken.value;
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
        client_id: process.env.DROPBOX_APP_KEY!,
        client_secret: process.env.DROPBOX_APP_SECRET!,
      }),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !data.access_token) throw new Error(data.error_description || "dropbox_auth_failed");
    dropboxToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 14400) - 60) * 1000 };
    return data.access_token;
  }
  return process.env.DROPBOX_ACCESS_TOKEN!;
}

/** Resolves the position title from the page the ticket was created on. */
async function positionTitleFromLink(link: string): Promise<string> {
  try {
    const path = new URL(link).pathname;
    const positionMatch = path.match(/^\/positions\/([^/]+)/);
    if (positionMatch) {
      const position = await prisma.position.findUnique({ where: { id: positionMatch[1] }, select: { title: true } });
      return position?.title ?? "";
    }
    const cvMatch = path.match(/^\/cvs\/([^/]+)/);
    if (cvMatch) {
      const cv = await prisma.cv.findUnique({
        where: { id: cvMatch[1] },
        select: { position: { select: { title: true } } },
      });
      return cv?.position.title ?? "";
    }
  } catch {
    /* not a URL — no position context */
  }
  return "";
}

const ticketSchema = z.object({
  summary: z.string().min(1).max(1000),
  priority: z.enum(["High", "Average", "Low"]),
  link: z.string().max(2000),
});

supportRouter.post("/tickets", requireAuth, async (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  if (!dropboxConfigured()) return res.status(503).json({ error: "not_configured" });
  const { summary, priority, link } = parsed.data;
  const user = req.user!;

  const [positionTitle, admins] = await Promise.all([
    positionTitleFromLink(link),
    prisma.user.findMany({ where: { role: "ADMIN", blocked: false }, select: { email: true } }),
  ]);

  const ticket = {
    reportedBy: `${user.name} <${user.email}> (${user.role})`,
    position: positionTitle,
    link,
    priority,
    summary,
    adminEmails: admins.map((a) => a.email),
    createdAt: new Date().toISOString(),
  };

  const filename = `/support-tickets/ticket-${Date.now()}.json`;
  try {
    const token = await getDropboxToken();
    const upload = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: filename, mode: "add", autorename: true, mute: false }),
        "Content-Type": "application/octet-stream",
      },
      body: JSON.stringify(ticket, null, 2),
    });
    if (!upload.ok) {
      const detail = await upload.text().catch(() => "");
      return res.status(502).json({ error: `dropbox_http_${upload.status}`, detail });
    }
    const meta = (await upload.json()) as { path_display?: string };
    res.json({ ok: true, file: meta.path_display ?? filename });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "dropbox_failed" });
  }
});
