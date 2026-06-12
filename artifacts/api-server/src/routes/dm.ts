import { Router } from "express";
import { eq, desc, or, sql } from "drizzle-orm";
import { db, dmThreadsTable, dmMessagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.get("/dm/threads", requireAuth, async (req, res) => {
  try {
    const threads = await db.select().from(dmThreadsTable)
      .where(or(eq(dmThreadsTable.adminId, req.user!.userId), eq(dmThreadsTable.memberId, req.user!.userId)))
      .orderBy(desc(dmThreadsTable.lastMessageAt));
    res.json(threads);
  } catch (err) {
    console.error("Get DM threads error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dm/threads/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const messages = await db.select().from(dmMessagesTable)
      .where(eq(dmMessagesTable.threadId, req.params.threadId))
      .orderBy(desc(dmMessagesTable.createdAt));
    res.json(messages.reverse());
  } catch (err) {
    console.error("Get DM messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/dm/threads/:threadId/messages", requireAuth, async (req, res) => {
  try {
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const [user] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [msg] = await db.insert(dmMessagesTable).values({
      threadId: req.params.threadId,
      senderId: req.user!.userId,
      senderName: user.name,
      text,
    }).returning();
    const isMember = user.role !== "admin";
    await db.update(dmThreadsTable).set({
      lastMessage: text,
      lastMessageAt: new Date(),
      unreadForAdmin: isMember ? sql`unread_for_admin + 1` : 0,
    }).where(eq(dmThreadsTable.id, req.params.threadId));
    res.status(201).json(msg);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Send DM error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
