import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, asc, sql, and } from 'drizzle-orm';
import {
  pgTable, uuid, text, timestamp, boolean, integer,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const app = new Hono();
app.use('/*', cors());

// ── Schema ────────────────────────────────────────────────────────
const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'moderator', 'member'] }).notNull().default('member'),
  avatar: text('avatar'),
  bio: text('bio').notNull().default(''),
  fcmToken: text('fcm_token'),
  emailVerified: text('email_verified').notNull().default('false'),
  verificationToken: text('verification_token'),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const postsTable = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull(),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const commentsTable = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull(),
  authorId: uuid('author_id').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const eventsTable = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  description: text('description'),
  link: text('link'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const announcementsTable = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const chatMessagesTable = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull().default('member'),
  senderAvatar: text('sender_avatar'),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const notificationsTable = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const dmThreadsTable = pgTable('dm_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  participant1: uuid('participant1').notNull(),
  participant2: uuid('participant2').notNull(),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const dmMessagesTable = pgTable('dm_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull(),
  senderId: uuid('sender_id').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────
const insertPostSchema = createInsertSchema(postsTable).pick({ text: true, imageUrl: true });
const insertCommentSchema = createInsertSchema(commentsTable).pick({ postId: true, text: true });
const insertEventSchema = createInsertSchema(eventsTable).pick({ title: true, date: true, description: true, link: true });
const insertAnnouncementSchema = createInsertSchema(announcementsTable).pick({ title: true, body: true });
const insertChatSchema = createInsertSchema(chatMessagesTable).pick({ text: true });
const registerSchema = z.object({ name: z.string().min(1).max(100), email: z.string().email(), password: z.string().min(6).max(128) });

// ── DB helper ─────────────────────────────────────────────────────
const dbCache = new Map();
function getDb(env) {
  const key = env.DATABASE_URL;
  if (!dbCache.has(key)) {
    const sql = neon(key);
    dbCache.set(key, drizzle(sql));
  }
  return dbCache.get(key);
}

// ── Auth helpers ──────────────────────────────────────────────────
function getSecret(c) { return c.env.JWT_SECRET || 'dev-secret-change-in-production'; }
function generateToken(payload, secret) { return jwt.sign(payload, secret, { expiresIn: '7d' }); }

async function requireAuth(c, next) {
  const secret = getSecret(c);
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  try {
    c.set('user', jwt.verify(header.slice(7), secret));
    await next();
  } catch { return c.json({ error: 'Invalid token' }, 401); }
}

function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403);
    await next();
  };
}

// ── Health ────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Auth routes ───────────────────────────────────────────────────
app.post('/api/auth/register', async (c) => {
  try {
    const body = registerSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing) return c.json({ error: 'Email already registered' }, 409);
    const hash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name, email: body.email, passwordHash: hash,
      role: 'member', lastSeen: new Date(),
    }).returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatar: usersTable.avatar, bio: usersTable.bio, lastSeen: usersTable.lastSeen });
    const secret = getSecret(c);
    const token = generateToken({ userId: user.id, role: user.role }, secret);
    return c.json({ user, token }, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Register error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
    const db = getDb(c.env);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return c.json({ error: 'Invalid email or password' }, 401);
    const secret = getSecret(c);
    const token = generateToken({ userId: user.id, role: user.role }, secret);
    return c.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, lastSeen: user.lastSeen },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/auth/me', requireAuth, async (c) => {
  try {
    const u = c.get('user');
    const db = getDb(c.env);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, u.userId)).limit(1);
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, emailVerified: user.emailVerified, lastSeen: user.lastSeen });
  } catch (err) { console.error('Me error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Posts ─────────────────────────────────────────────────────────
app.get('/api/posts', async (c) => {
  try {
    const db = getDb(c.env);
    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.pinned), desc(postsTable.createdAt));
    const users = await db.select().from(usersTable);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const [commentCounts, likeCounts] = await Promise.all([
      db.select({ postId: commentsTable.postId, count: sql`count(*)::int` }).from(commentsTable).groupBy(commentsTable.postId),
      Promise.resolve([]),
    ]);
    const ccMap = Object.fromEntries(commentCounts.map(r => [r.postId, r.count]));
    return c.json(posts.map(p => ({
      ...p, authorName: userMap[p.authorId]?.name || 'Unknown',
      authorRole: userMap[p.authorId]?.role || 'member',
      authorAvatar: userMap[p.authorId]?.avatar || null,
      commentCount: ccMap[p.id] || 0, likeCount: 0,
    })));
  } catch (err) { console.error('Posts error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/posts', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = insertPostSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [post] = await db.insert(postsTable).values({ ...body, authorId: user.userId }).returning();
    return c.json(post, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Create post error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/posts/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, c.req.param('id'))).limit(1);
    if (!post) return c.json({ error: 'Post not found' }, 404);
    if (post.authorId !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db.delete(postsTable).where(eq(postsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Delete post error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/posts/:id/pin', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    const { pinned } = await c.req.json();
    const db = getDb(c.env);
    await db.update(postsTable).set({ pinned: pinned === true }).where(eq(postsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Pin error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Comments ──────────────────────────────────────────────────────
app.get('/api/posts/:postId/comments', async (c) => {
  try {
    const db = getDb(c.env);
    const comments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, c.req.param('postId'))).orderBy(asc(commentsTable.createdAt));
    const userIds = [...new Set(comments.map(c => c.authorId))];
    const users = userIds.length ? await db.select().from(usersTable)
      .where(sql`${usersTable.id} = ANY(${sql.arr(userIds)})`) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return c.json(comments.map(cm => ({
      ...cm, authorName: userMap[cm.authorId]?.name || 'Unknown',
      authorRole: userMap[cm.authorId]?.role || 'member',
      authorAvatar: userMap[cm.authorId]?.avatar || null,
    })));
  } catch (err) { console.error('Comments error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/posts/:postId/comments', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { text } = z.object({ text: z.string().min(1).max(1000) }).parse(await c.req.json());
    const db = getDb(c.env);
    const [cm] = await db.insert(commentsTable).values({ postId: c.req.param('postId'), authorId: user.userId, text }).returning();
    return c.json(cm, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Create comment error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/comments/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [cm] = await db.select().from(commentsTable).where(eq(commentsTable.id, c.req.param('id'))).limit(1);
    if (!cm) return c.json({ error: 'Comment not found' }, 404);
    if (cm.authorId !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db.delete(commentsTable).where(eq(commentsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Delete comment error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Events ────────────────────────────────────────────────────────
app.get('/api/events', async (c) => {
  try {
    const db = getDb(c.env);
    const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt));
    const users = await db.select().from(usersTable);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return c.json(events.map(e => ({
      ...e, authorName: userMap[e.authorId]?.name || 'Unknown',
      authorRole: userMap[e.authorId]?.role || 'member',
    })));
  } catch (err) { console.error('Events error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/events', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const body = insertEventSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [ev] = await db.insert(eventsTable).values({ ...body, authorId: user.userId }).returning();
    return c.json(ev, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Create event error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/events/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const db = getDb(c.env);
    const [ev] = await db.select().from(eventsTable).where(eq(eventsTable.id, c.req.param('id'))).limit(1);
    if (!ev) return c.json({ error: 'Event not found' }, 404);
    if (ev.authorId !== user.userId && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    await db.delete(eventsTable).where(eq(eventsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Delete event error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Announcements ─────────────────────────────────────────────────
app.get('/api/announcements', async (c) => {
  try {
    const db = getDb(c.env);
    const anns = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    const users = await db.select().from(usersTable);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return c.json(anns.map(a => ({
      ...a, authorName: userMap[a.authorId]?.name || 'Unknown',
      authorRole: userMap[a.authorId]?.role || 'member',
    })));
  } catch (err) { console.error('Announcements error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/announcements', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const body = insertAnnouncementSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [ann] = await db.insert(announcementsTable).values({ ...body, authorId: user.userId }).returning();
    return c.json(ann, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Create announcement error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/announcements/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const db = getDb(c.env);
    const [ann] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, c.req.param('id'))).limit(1);
    if (!ann) return c.json({ error: 'Announcement not found' }, 404);
    if (ann.authorId !== user.userId && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Delete announcement error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Chat ──────────────────────────────────────────────────────────
app.get('/api/chat', async (c) => {
  try {
    const db = getDb(c.env);
    const messages = await db.select().from(chatMessagesTable).orderBy(desc(chatMessagesTable.createdAt)).limit(80);
    return c.json(messages.reverse());
  } catch (err) { console.error('Chat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/chat', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { text } = insertChatSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [usr] = await db.select({ name: usersTable.name, role: usersTable.role, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
    if (!usr) return c.json({ error: 'User not found' }, 404);
    const [msg] = await db.insert(chatMessagesTable).values({
      senderId: user.userId, senderName: usr.name, senderRole: usr.role, senderAvatar: usr.avatar, text,
    }).returning();
    return c.json(msg, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Send chat error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/chat/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, c.req.param('id'))).limit(1);
    if (!msg) return c.json({ error: 'Message not found' }, 404);
    if (msg.senderId !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Delete chat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Notifications ─────────────────────────────────────────────────
app.get('/api/notifications', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user.userId)).orderBy(desc(notificationsTable.createdAt)).limit(50);
    return c.json(notifs);
  } catch (err) { console.error('Notifications error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/notifications/read-all', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, user.userId));
    return c.json({ success: true });
  } catch (err) { console.error('Read all error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/notifications/:id/read', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [notif] = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.id, c.req.param('id')), eq(notificationsTable.userId, user.userId))).limit(1);
    if (!notif) return c.json({ error: 'Notification not found' }, 404);
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, c.req.param('id')));
    return c.json({ success: true });
  } catch (err) { console.error('Read notif error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/notifications/broadcast', requireAuth, requireRole('admin'), async (c) => {
  try {
    const { title, message } = await c.req.json();
    if (!title || !message) return c.json({ error: 'Title and message required' }, 400);
    const db = getDb(c.env);
    const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
    if (allUsers.length) {
      await db.insert(notificationsTable).values(allUsers.map(u => ({ userId: u.id, title, message, type: 'broadcast' })));
    }
    return c.json({ success: true, count: allUsers.length });
  } catch (err) { console.error('Broadcast error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Users ─────────────────────────────────────────────────────────
app.get('/api/users', async (c) => {
  try {
    const db = getDb(c.env);
    const users = await db.select().from(usersTable).orderBy(asc(usersTable.name));
    return c.json(users.map(({ passwordHash, fcmToken, verificationToken, ...u }) => u));
  } catch (err) { console.error('Users error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/users/:id', async (c) => {
  try {
    const db = getDb(c.env);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.req.param('id'))).limit(1);
    if (!user) return c.json({ error: 'User not found' }, 404);
    const { passwordHash, fcmToken, verificationToken, ...u } = user;
    return c.json(u);
  } catch (err) { console.error('Get user error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/users/:id', requireAuth, async (c) => {
  try {
    const authedUser = c.get('user');
    const db = getDb(c.env);
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, c.req.param('id'))).limit(1);
    if (!target) return c.json({ error: 'User not found' }, 404);
    if (authedUser.userId !== c.req.param('id') && authedUser.role !== 'admin')
      return c.json({ error: 'Forbidden' }, 403);
    const body = await c.req.json();
    const allowed = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.bio !== undefined) allowed.bio = body.bio;
    if (body.avatar !== undefined) allowed.avatar = body.avatar;
    if (body.role !== undefined && authedUser.role === 'admin') allowed.role = body.role;
    if (!Object.keys(allowed).length) return c.json({ error: 'No valid fields to update' }, 400);
    const [updated] = await db.update(usersTable).set(allowed).where(eq(usersTable.id, c.req.param('id'))).returning();
    const { passwordHash, fcmToken, verificationToken, ...u } = updated;
    return c.json(u);
  } catch (err) { console.error('Update user error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── DM ────────────────────────────────────────────────────────────
app.get('/api/dm/threads', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const threads = await db.select().from(dmThreadsTable)
      .where(sql`${dmThreadsTable.participant1} = ${user.userId} OR ${dmThreadsTable.participant2} = ${user.userId}`)
      .orderBy(desc(dmThreadsTable.lastMessageAt));
    const userIds = [...new Set(threads.flatMap(t => [t.participant1, t.participant2]))];
    const usersData = userIds.length ? await db.select().from(usersTable)
      .where(sql`${usersTable.id} = ANY(${sql.arr(userIds)})`) : [];
    const userMap = Object.fromEntries(usersData.map(u => [u.id, u]));
    const enriched = await Promise.all(threads.map(async (t) => {
      const otherId = t.participant1 === user.userId ? t.participant2 : t.participant1;
      const other = userMap[otherId];
      const [lastMsg] = await db.select().from(dmMessagesTable)
        .where(eq(dmMessagesTable.threadId, t.id)).orderBy(desc(dmMessagesTable.createdAt)).limit(1);
      return { id: t.id, otherUser: other ? { id: other.id, name: other.name, avatar: other.avatar } : { id: otherId, name: 'Unknown' }, lastMessage: lastMsg || null, lastMessageAt: t.lastMessageAt };
    }));
    return c.json(enriched);
  } catch (err) { console.error('DM threads error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/dm/threads/:threadId/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [thread] = await db.select().from(dmThreadsTable).where(eq(dmThreadsTable.id, c.req.param('threadId'))).limit(1);
    if (!thread || (thread.participant1 !== user.userId && thread.participant2 !== user.userId))
      return c.json({ error: 'Thread not found' }, 404);
    const messages = await db.select().from(dmMessagesTable)
      .where(eq(dmMessagesTable.threadId, c.req.param('threadId'))).orderBy(asc(dmMessagesTable.createdAt));
    return c.json(messages);
  } catch (err) { console.error('DM messages error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/dm/threads/:threadId/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    const [thread] = await db.select().from(dmThreadsTable).where(eq(dmThreadsTable.id, c.req.param('threadId'))).limit(1);
    if (!thread || (thread.participant1 !== user.userId && thread.participant2 !== user.userId))
      return c.json({ error: 'Thread not found' }, 404);
    const { text } = z.object({ text: z.string().min(1).max(5000) }).parse(await c.req.json());
    const [msg] = await db.insert(dmMessagesTable).values({ threadId: c.req.param('threadId'), senderId: user.userId, text }).returning();
    await db.update(dmThreadsTable).set({ lastMessageAt: new Date() }).where(eq(dmThreadsTable.id, c.req.param('threadId')));
    return c.json(msg, 201);
  } catch (err) {
    if (err?.issues) return c.json({ error: 'Validation error', details: err.issues }, 400);
    console.error('Send DM error:', err); return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Heartbeat ─────────────────────────────────────────────────────
app.post('/api/heartbeat', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);
    await db.update(usersTable).set({ lastSeen: new Date() }).where(eq(usersTable.id, user.userId));
    return c.json({ ok: true });
  } catch (err) { console.error('Heartbeat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

export default app;
