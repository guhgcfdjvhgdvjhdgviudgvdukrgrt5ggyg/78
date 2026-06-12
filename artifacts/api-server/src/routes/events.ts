import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, eventsTable, insertEventSchema } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const allEvents = await db.select().from(eventsTable).orderBy(asc(eventsTable.date));
    res.json(allEvents);
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events", requireAuth, requireRole("admin", "moderator"), async (req, res) => {
  try {
    const body = insertEventSchema.parse(req.body);
    const [event] = await db.insert(eventsTable).values({ ...body, createdBy: req.user!.userId }).returning();
    res.status(201).json(event);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Validation error", details: err.issues });
    console.error("Create event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/events/:id", requireAuth, requireRole("admin", "moderator"), async (req, res) => {
  try {
    await db.delete(eventsTable).where(eq(eventsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
