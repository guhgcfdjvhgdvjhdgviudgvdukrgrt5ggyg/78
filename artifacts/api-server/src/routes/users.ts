import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable, updateUserSchema } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/users", async (req, res) => {
  try {
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
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
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
    }).from(usersTable).where(eq(usersTable.id, req.params.id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireAuth, async (req, res) => {
  try {
    const isSelf = req.params.id === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isSelf && !isAdmin) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (!isSelf && !isAdmin && req.body.role) {
      res.status(403).json({ error: "Only admins can change roles" }); return;
    }
    const body = updateUserSchema.parse(req.body);
    const [user] = await db.update(usersTable).set(body).where(eq(usersTable.id, req.params.id))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatar: usersTable.avatar, bio: usersTable.bio, emailVerified: usersTable.emailVerified, lastSeen: usersTable.lastSeen });
    res.json(user);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Update user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
