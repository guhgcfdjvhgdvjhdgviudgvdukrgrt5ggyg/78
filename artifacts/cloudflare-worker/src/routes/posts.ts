import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { postsTable, usersTable, insertPostSchema } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/posts", async (c) => {
  try {
    const db = getDb(c.env);
    const allPosts = await db.select().from(postsTable).orderBy(desc(postsTable.pinned), desc(postsTable.createdAt));
    const users = await db.select().from(usersTable);
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const enriched = allPosts.map((p) => ({
      ...p,
      authorName: userMap[p.authorId]?.name || "Unknown",
      authorRole: userMap[p.authorId]?.role || "member",
      authorAvatar: userMap[p.authorId]?.avatar || null,
    }));
    return c.json(enriched);
  } catch (err) {
    console.error("Get posts error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/posts", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const body = insertPostSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [post] = await db.insert(postsTable).values({
      ...body,
      authorId: user.userId,
    }).returning();
    return c.json(post, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Create post error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/posts/:id", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, c.req.param("id"))).limit(1);
    if (!post) { return c.json({ error: "Post not found" }, 404); }
    if (post.authorId !== user.userId && user.role === "member") {
      return c.json({ error: "Forbidden" }, 403);
    }
    await db.delete(postsTable).where(eq(postsTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete post error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/posts/:id/pin", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    if (user.role !== "admin") { return c.json({ error: "Forbidden" }, 403); }
    const { pinned } = await c.req.json();
    const db = getDb(c.env);
    await db.update(postsTable).set({ pinned: pinned === true }).where(eq(postsTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Pin post error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
