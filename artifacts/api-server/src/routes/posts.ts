import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, postsTable, usersTable, insertPostSchema } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/posts", async (req, res) => {
  try {
    const allPosts = await db.select().from(postsTable).orderBy(desc(postsTable.pinned), desc(postsTable.createdAt));
    const users = await db.select().from(usersTable);
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const enriched = allPosts.map((p) => ({
      ...p,
      id: p.id,
      likes: Array.isArray(p.likes) ? p.likes : [],
      commentCount: p.commentCount ?? 0,
      authorName: userMap[p.authorId]?.name ?? "Unknown",
      authorRole: userMap[p.authorId]?.role ?? "member",
      authorAvatar: userMap[p.authorId]?.avatar ?? null,
    }));
    res.json(enriched);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", requireAuth, async (req, res) => {
  try {
    const body = insertPostSchema.parse(req.body);
    const [post] = await db.insert(postsTable).values({
      ...body,
      authorId: req.user!.userId,
    }).returning();
    res.status(201).json(post);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Create post error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (post.authorId !== req.user!.userId && req.user!.role === "member") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(postsTable).where(eq(postsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/posts/:id/pin", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const pinned = req.body.pinned === true;
    await db.update(postsTable).set({ pinned }).where(eq(postsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Pin post error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
