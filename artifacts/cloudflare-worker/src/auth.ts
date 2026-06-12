import jwt from "jsonwebtoken";
import type { Context, Next } from "hono";

export interface AuthPayload {
  userId: string;
  role: "admin" | "moderator" | "member";
}

export function generateToken(payload: AuthPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export async function requireAuth(c: Context, next: Next) {
  const secret = c.env.JWT_SECRET || "dev-secret-change-in-production";
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = jwt.verify(header.slice(7), secret) as AuthPayload;
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user: AuthPayload | undefined = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
