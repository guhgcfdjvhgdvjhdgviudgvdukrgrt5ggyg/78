import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const dmThreadsTable = pgTable("dm_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  memberAvatar: text("member_avatar"),
  adminId: uuid("admin_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lastMessage: text("last_message").notNull().default(""),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  unreadForAdmin: integer("unread_for_admin").notNull().default(1),
});

export const dmMessagesTable = pgTable("dm_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id").notNull().references(() => dmThreadsTable.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDmMessageSchema = createInsertSchema(dmMessagesTable).omit({
  id: true,
  senderName: true,
  createdAt: true,
});

export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type DmMessage = typeof dmMessagesTable.$inferSelect;
export type DmThread = typeof dmThreadsTable.$inferSelect;
