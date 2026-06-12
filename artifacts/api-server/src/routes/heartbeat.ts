import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/heartbeat", requireAuth, async (req, res) => {
  try {
    await db.update(usersTable).set({ lastSeen: new Date() }).where(eq(usersTable.id, req.user!.userId));
    res.json({ ok: true });
  } catch (err) {
    console.error("Heartbeat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
