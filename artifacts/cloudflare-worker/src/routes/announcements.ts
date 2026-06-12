import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { announcementsTable, insertAnnouncementSchema } from "../schema";
import { requireAuth, requireRole } from "../auth";

const router = new Hono();

router.get("/announcements", async (c) => {
  try {
    const db = getDb(c.env);
    const all = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    return c.json(all);
  } catch (err) {
    console.error("Get announcements error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/announcements", requireAuth, requireRole("admin", "moderator"), async (c) => {
  try {
    const body = insertAnnouncementSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [ann] = await db.insert(announcementsTable).values(body).returning();
    return c.json(ann, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Create announcement error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/announcements/:id", requireAuth, requireRole("admin", "moderator"), async (c) => {
  try {
    const db = getDb(c.env);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
