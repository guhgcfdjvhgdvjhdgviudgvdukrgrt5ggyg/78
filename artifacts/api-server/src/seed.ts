import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const [existingAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  if (existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, existingAdmin.id));
    console.log("Admin password reset: admin123");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    name: "Admin",
    email: "admin@community.com",
    passwordHash,
    role: "admin",
  });

  console.log("Admin user created: admin@community.com / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
