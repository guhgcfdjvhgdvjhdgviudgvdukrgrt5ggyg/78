import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable, insertAnnouncementSchema } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/announcements", async (req, res) => {
  try {
    const all = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    res.json(all);
  } catch (err) {
    console.error("Get announcements error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/announcements", requireAuth, requireRole("admin", "moderator"), async (req, res) => {
  try {
    const body = insertAnnouncementSchema.parse(req.body);
    const [ann] = await db.insert(announcementsTable).values(body).returning();
    res.status(201).json(ann);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/announcements/:id", requireAuth, requireRole("admin", "moderator"), async (req, res) => {
  try {
    await db.delete(announcementsTable).where(eq(announcementsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
