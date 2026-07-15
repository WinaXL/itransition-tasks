import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { Role, User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const COOKIE = "cv_token";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function issueToken(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

export function clearToken(res: Response) {
  res.clearCookie(COOKIE);
}

/** Attaches req.user if a valid token cookie is present; never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user && !user.blocked) req.user = user;
    } catch {
      /* invalid/expired token — treat as anonymous */
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "auth_required" });
  next();
}

/** Recruiter-or-admin guard (recruiters and admins share position/attribute management). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    if (req.user.role === "ADMIN" || roles.includes(req.user.role)) return next();
    res.status(403).json({ error: "forbidden" });
  };
}

export function isAdmin(req: Request) {
  return req.user?.role === "ADMIN";
}

export function isRecruiter(req: Request) {
  return req.user?.role === "RECRUITER" || req.user?.role === "ADMIN";
}
