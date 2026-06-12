import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { usersTable } from "../schema";
import { generateToken, requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const router = new Hono();

router.post("/auth/register", async (c) => {
  try {
    const body = registerSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing.length > 0) {
      return c.json({ error: "Email already registered" }, 409);
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name,
      email: body.email,
      passwordHash,
      role: "member",
      bio: (body as any).bio || "",
      lastSeen: new Date(),
    }).returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatar: usersTable.avatar, bio: usersTable.bio, lastSeen: usersTable.lastSeen });
    const secret = c.env.JWT_SECRET || "dev-secret-change-in-production";
    const token = generateToken({ userId: user.id, role: user.role }, secret);
    return c.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, lastSeen: user.lastSeen }, token }, 201);
  } catch (err: any) {
    if (err?.issues) {
      return c.json({ error: "Validation error", details: err.issues }, 400);
    }
    console.error("Register error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }
    const db = getDb(c.env);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const secret = c.env.JWT_SECRET || "dev-secret-change-in-production";
    const token = generateToken({ userId: user.id, role: user.role }, secret);
    return c.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, lastSeen: user.lastSeen }, token });
  } catch (err) {
    console.error("Login error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.get("/auth/me", requireAuth, async (c) => {
  try {
    const userData: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userData.userId)).limit(1);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, emailVerified: user.emailVerified, lastSeen: user.lastSeen });
  } catch (err) {
    console.error("Get me error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
