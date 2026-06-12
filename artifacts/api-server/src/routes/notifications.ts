import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable, usersTable, announcementsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user!.userId))
      .orderBy(desc(notificationsTable.createdAt));
    res.json(notifs);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.userId, req.user!.userId));
    res.json({ success: true });
  } catch (err) {
    console.error("Read all notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Read notification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/broadcast", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { title, message } = z.object({ title: z.string().min(1), message: z.string().min(1) }).parse(req.body);
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
    res.json({ success: true, count: users.length });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Broadcast error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
