import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { attachUser, clearToken, issueToken, requireAuth } from "../auth";

export const authRouter = Router();

const APP_URL = () => process.env.APP_URL || "http://localhost:5173";
const API_URL = () => process.env.API_URL || "http://localhost:3000";

function publicUser(u: { id: string; email: string; name: string; role: string; avatarUrl: string | null; language: string; theme: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatarUrl, language: u.language, theme: u.theme };
}

async function loginOAuthUser(
  provider: "google" | "github",
  providerId: string,
  email: string,
  name: string,
  avatarUrl: string | null
) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ provider, providerId }, { email }] },
  });
  if (existing) {
    if (existing.blocked) return null;
    return prisma.user.update({
      where: { id: existing.id },
      data: { provider, providerId, avatarUrl: avatarUrl ?? existing.avatarUrl },
    });
  }
  return prisma.user.create({ data: { provider, providerId, email, name, avatarUrl } });
}

// ---------- Google ----------
authRouter.get("/google", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${API_URL()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get("/google/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${API_URL()}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const p = (await profileRes.json()) as { id: string; email: string; name: string; picture?: string };
    const user = await loginOAuthUser("google", p.id, p.email, p.name || p.email, p.picture ?? null);
    if (!user) return res.redirect(`${APP_URL()}/login?error=blocked`);
    issueToken(res, user.id);
    res.redirect(APP_URL());
  } catch {
    res.redirect(`${APP_URL()}/login?error=oauth_failed`);
  }
});

// ---------- GitHub ----------
authRouter.get("/github", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || "",
    redirect_uri: `${API_URL()}/api/auth/github/callback`,
    scope: "user:email",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

authRouter.get("/github/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    const gh = { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/vnd.github+json" } };
    const p = (await (await fetch("https://api.github.com/user", gh)).json()) as {
      id: number; login: string; name: string | null; avatar_url: string; email: string | null;
    };
    let email = p.email;
    if (!email) {
      const emails = (await (await fetch("https://api.github.com/user/emails", gh)).json()) as
        { email: string; primary: boolean }[];
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? `${p.login}@users.noreply.github.com`;
    }
    const user = await loginOAuthUser("github", String(p.id), email, p.name || p.login, p.avatar_url);
    if (!user) return res.redirect(`${APP_URL()}/login?error=blocked`);
    issueToken(res, user.id);
    res.redirect(APP_URL());
  } catch {
    res.redirect(`${APP_URL()}/login?error=oauth_failed`);
  }
});

// ---------- Form auth ----------
const credsSchema = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(1).optional() });

authRouter.post("/register", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { email, password, name } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } }))
    return res.status(409).json({ error: "email_taken" });
  const user = await prisma.user.create({
    data: { email, name: name || email.split("@")[0], passwordHash: await bcrypt.hash(password, 10) },
  });
  issueToken(res, user.id);
  res.json(publicUser(user));
});

authRouter.post("/login", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash)))
    return res.status(401).json({ error: "bad_credentials" });
  if (user.blocked) return res.status(403).json({ error: "blocked" });
  issueToken(res, user.id);
  res.json(publicUser(user));
});

authRouter.post("/logout", (_req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

authRouter.get("/me", attachUser, (req, res) => {
  res.json(req.user ? publicUser(req.user) : null);
});

authRouter.patch("/prefs", attachUser, requireAuth, async (req, res) => {
  const schema = z.object({ language: z.enum(["en", "ru"]).optional(), theme: z.enum(["light", "dark"]).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: parsed.data });
  res.json(publicUser(user));
});
