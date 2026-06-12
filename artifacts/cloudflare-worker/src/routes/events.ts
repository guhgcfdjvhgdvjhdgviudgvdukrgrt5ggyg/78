import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { getDb } from "../db";
import { eventsTable, insertEventSchema } from "../schema";
import { requireAuth, requireRole } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.get("/events", async (c) => {
  try {
    const db = getDb(c.env);
    const allEvents = await db.select().from(eventsTable).orderBy(asc(eventsTable.date));
    return c.json(allEvents);
  } catch (err) {
    console.error("Get events error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/events", requireAuth, requireRole("admin", "moderator"), async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const body = insertEventSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [event] = await db.insert(eventsTable).values({ ...body, createdBy: user.userId }).returning();
    return c.json(event, 201);
  } catch (err: any) {
    if (err?.issues) return c.json({ error: "Validation error", details: err.issues }, 400);
    console.error("Create event error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/events/:id", requireAuth, requireRole("admin", "moderator"), async (c) => {
  try {
    const db = getDb(c.env);
    await db.delete(eventsTable).where(eq(eventsTable.id, c.req.param("id")));
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
