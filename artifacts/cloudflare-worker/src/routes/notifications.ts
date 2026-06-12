import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { notificationsTable, usersTable, announcementsTable } from "../schema";
import { requireAuth, requireRole } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/notifications", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user.userId))
      .orderBy(desc(notificationsTable.createdAt));
    return c.json(notifs);
  } catch (err) {
    console.error("Get notifications error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/notifications/read-all", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.userId, user.userId));
    return c.json({ success: true });
  } catch (err) {
    console.error("Read all notifications error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/notifications/:id/read", requireAuth, async (c) => {
  try {
    const db = getDb(c.env);
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Read notification error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/notifications/broadcast", requireAuth, requireRole("admin"), async (c) => {
  try {
    const { title, message } = z.object({ title: z.string().min(1), message: z.string().min(1) }).parse(await c.req.json());
    const db = getDb(c.env);
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    const notifValues = users.map((u) => ({
      userId: u.id,
      type: "broadcast" as const,
      message: `📢 ${title}: ${message}`,
    }));
    for (const nv of notifValues) {
      await db.insert(notificationsTable).values(nv);
    }
    await db.insert(announcementsTable).values({ title, body: message });
    return c.json({ success: true, count: users.length });
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Broadcast error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
