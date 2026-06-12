import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, chatMessagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.get("/chat", async (req, res) => {
  try {
    const messages = await db.select().from(chatMessagesTable).orderBy(desc(chatMessagesTable.createdAt)).limit(80);
    res.json(messages.reverse());
  } catch (err) {
    console.error("Get chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { text } = z.object({ text: z.string().min(1).max(1000) }).parse(req.body);
    const [user] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [msg] = await db.insert(chatMessagesTable).values({
      senderId: req.user!.userId,
      senderName: user.name,
      senderRole: user.role,
      senderAvatar: user.avatar,
      text,
    }).returning();
    res.status(201).json(msg);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Send chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/chat/:id", requireAuth, async (req, res) => {
  try {
    const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, req.params.id)).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (msg.senderId !== req.user!.userId && req.user!.role === "member") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete chat message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
