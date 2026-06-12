import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, commentsTable, postsTable, usersTable, insertCommentSchema } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const allComments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, req.params.postId))
      .orderBy(desc(commentsTable.createdAt));
    const enriched = await Promise.all(allComments.map(async (c) => {
      const [author] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
        .from(usersTable).where(eq(usersTable.id, c.authorId)).limit(1);
      return { ...c, authorName: author?.name || "Unknown", authorRole: author?.role || "member", authorAvatar: author?.avatar || null };
    }));
    res.json(enriched);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const body = insertCommentSchema.parse(req.body);
    const [post] = await db.select({ id: postsTable.id }).from(postsTable)
      .where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    const [comment] = await db.insert(commentsTable).values({
      postId: req.params.postId,
      authorId: req.user!.userId,
      text: body.text,
    }).returning();
    await db.update(postsTable).set({ commentCount: sql`comment_count + 1` })
      .where(eq(postsTable.id, req.params.postId));
    res.status(201).json(comment);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/comments/:id", requireAuth, async (req, res) => {
  try {
    const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.id)).limit(1);
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
    if (comment.authorId !== req.user!.userId && req.user!.role === "member") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(commentsTable).where(eq(commentsTable.id, req.params.id));
    await db.update(postsTable).set({ commentCount: sql`comment_count - 1` })
      .where(eq(postsTable.id, comment.postId));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
