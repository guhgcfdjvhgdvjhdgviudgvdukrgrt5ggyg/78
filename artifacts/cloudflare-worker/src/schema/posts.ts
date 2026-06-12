import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  imageUrl: text("image_url"),
  likes: text("likes").array().notNull().default([]),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  pinned: boolean("pinned").notNull().default(false),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  authorId: true,
  likes: true,
  commentCount: true,
  createdAt: true,
  pinned: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
