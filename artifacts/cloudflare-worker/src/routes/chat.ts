import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { chatMessagesTable, usersTable } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/chat", async (c) => {
  try {
    const db = getDb(c.env);
    const messages = await db.select().from(chatMessagesTable).orderBy(desc(chatMessagesTable.createdAt)).limit(80);
    return c.json(messages.reverse());
  } catch (err) {
    console.error("Get chat error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/chat", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const { text } = z.object({ text: z.string().min(1).max(1000) }).parse(await c.req.json());
    const db = getDb(c.env);
    const [usr] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
    if (!usr) { return c.json({ error: "User not found" }, 404); }
    const [msg] = await db.insert(chatMessagesTable).values({
      senderId: user.userId,
      senderName: usr.name,
      senderRole: usr.role,
      senderAvatar: usr.avatar,
      text,
    }).returning();
    return c.json(msg, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Send chat error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/chat/:id", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, c.req.param("id"))).limit(1);
    if (!msg) { return c.json({ error: "Message not found" }, 404); }
    if (msg.senderId !== user.userId && user.role === "member") {
      return c.json({ error: "Forbidden" }, 403);
    }
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete chat message error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
