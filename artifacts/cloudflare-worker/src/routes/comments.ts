import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { commentsTable, postsTable, usersTable, insertCommentSchema } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/posts/:postId/comments", async (c) => {
  try {
    const db = getDb(c.env);
    const allComments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, c.req.param("postId")))
      .orderBy(desc(commentsTable.createdAt));
    const enriched = await Promise.all(allComments.map(async (cmt) => {
      const [author] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
        .from(usersTable).where(eq(usersTable.id, cmt.authorId)).limit(1);
      return { ...cmt, authorName: author?.name || "Unknown", authorRole: author?.role || "member", authorAvatar: author?.avatar || null };
    }));
    return c.json(enriched);
  } catch (err) {
    console.error("Get comments error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/posts/:postId/comments", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const body = insertCommentSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [post] = await db.select({ id: postsTable.id }).from(postsTable)
      .where(eq(postsTable.id, c.req.param("postId"))).limit(1);
    if (!post) { return c.json({ error: "Post not found" }, 404); }
    const [comment] = await db.insert(commentsTable).values({
      postId: c.req.param("postId"),
      authorId: user.userId,
      text: body.text,
    }).returning();
    await db.update(postsTable).set({ commentCount: sql`comment_count + 1` })
      .where(eq(postsTable.id, c.req.param("postId")));
    return c.json(comment, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Create comment error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/comments/:id", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, c.req.param("id"))).limit(1);
    if (!comment) { return c.json({ error: "Comment not found" }, 404); }
    if (comment.authorId !== user.userId && user.role === "member") {
      return c.json({ error: "Forbidden" }, 403);
    }
    await db.delete(commentsTable).where(eq(commentsTable.id, c.req.param("id")));
    await db.update(postsTable).set({ commentCount: sql`comment_count - 1` })
      .where(eq(postsTable.id, comment.postId));
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
