import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { usersTable, updateUserSchema } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/users", async (c) => {
  try {
    const db = getDb(c.env);
    const users = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      avatar: usersTable.avatar,
      bio: usersTable.bio,
      emailVerified: usersTable.emailVerified,
      lastSeen: usersTable.lastSeen,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(usersTable.role, usersTable.name);
    const roleOrder: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
    users.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));
    return c.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.get("/users/:id", async (c) => {
  try {
    const db = getDb(c.env);
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      avatar: usersTable.avatar,
      bio: usersTable.bio,
      emailVerified: usersTable.emailVerified,
      lastSeen: usersTable.lastSeen,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, c.req.param("id"))).limit(1);
    if (!user) { return c.json({ error: "User not found" }, 404); }
    return c.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/users/:id", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const isSelf = c.req.param("id") === user.userId;
    const isAdmin = user.role === "admin";
    if (!isSelf && !isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = updateUserSchema.parse(await c.req.json());
    if (!isSelf && !isAdmin && (body as any).role) {
      return c.json({ error: "Only admins can change roles" }, 403);
    }
    const db = getDb(c.env);
    const [updated] = await db.update(usersTable).set(body).where(eq(usersTable.id, c.req.param("id")))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatar: usersTable.avatar, bio: usersTable.bio, emailVerified: usersTable.emailVerified, lastSeen: usersTable.lastSeen });
    return c.json(updated);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Update user error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
