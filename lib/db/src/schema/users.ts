import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "moderator", "member"] }).notNull().default("member"),
  avatar: text("avatar"),
  bio: text("bio").notNull().default(""),
  fcmToken: text("fcm_token"),
  emailVerified: text("email_verified").notNull().default("false"),
  verificationToken: text("verification_token"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  role: true,
  fcmToken: true,
  createdAt: true,
});

export const updateUserSchema = createInsertSchema(usersTable).pick({
  name: true,
  bio: true,
  avatar: true,
  role: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof usersTable.$inferSelect;
