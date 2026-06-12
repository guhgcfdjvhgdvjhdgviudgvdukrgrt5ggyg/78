import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { usersTable } from "../schema";
import { requireAuth } from "../auth";
import type { AuthPayload } from "../auth";

const router = new Hono();

router.post("/heartbeat", requireAuth, async (c) => {
  try {
    const user: AuthPayload = c.get("user");
    const db = getDb(c.env);
    await db.update(usersTable).set({ lastSeen: new Date() }).where(eq(usersTable.id, user.userId));
    return c.json({ ok: true });
  } catch (err) {
    console.error("Heartbeat error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
