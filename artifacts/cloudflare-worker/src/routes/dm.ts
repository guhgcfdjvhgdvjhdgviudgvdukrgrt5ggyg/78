import { Hono } from "hono";
import { eq, desc, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { dmThreadsTable, dmMessagesTable, usersTable } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/dm/threads", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const threads = await db.select().from(dmThreadsTable)
      .where(or(eq(dmThreadsTable.adminId, user.userId), eq(dmThreadsTable.memberId, user.userId)))
      .orderBy(desc(dmThreadsTable.lastMessageAt));
    return c.json(threads);
  } catch (err) {
    console.error("Get DM threads error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.get("/dm/threads/:threadId/messages", requireAuth, async (c) => {
  try {
    const db = getDb(c.env);
    const messages = await db.select().from(dmMessagesTable)
      .where(eq(dmMessagesTable.threadId, c.req.param("threadId")))
      .orderBy(desc(dmMessagesTable.createdAt));
    return c.json(messages.reverse());
  } catch (err) {
    console.error("Get DM messages error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/dm/threads/:threadId/messages", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(await c.req.json());
    const db = getDb(c.env);
    const [usr] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
    if (!usr) { return c.json({ error: "User not found" }, 404); }
    const [msg] = await db.insert(dmMessagesTable).values({
      threadId: c.req.param("threadId"),
      senderId: user.userId,
      senderName: usr.name,
      text,
    }).returning();
    const isMember = usr.role !== "admin";
    await db.update(dmThreadsTable).set({
      lastMessage: text,
      lastMessageAt: new Date(),
      unreadForAdmin: isMember ? sql`unread_for_admin + 1` : 0,
    }).where(eq(dmThreadsTable.id, c.req.param("threadId")));
    return c.json(msg, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Send DM error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
