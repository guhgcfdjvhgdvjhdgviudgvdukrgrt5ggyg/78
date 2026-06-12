import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';

const app = new Hono();
app.use('/*', cors());

// ── DB helper ─────────────────────────────────────────────────────
const dbCache = new Map();
function sql(env) {
  const key = env.DATABASE_URL;
  if (!dbCache.has(key)) dbCache.set(key, neon(key));
  return dbCache.get(key);
}

// ── Auth helpers ──────────────────────────────────────────────────
function secret(c) { return c.env.JWT_SECRET || 'dev-secret-change-in-production'; }

async function requireAuth(c, next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  try { c.set('user', jwt.verify(header.slice(7), secret(c))); await next(); }
  catch { return c.json({ error: 'Invalid token' }, 401); }
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
    const { name, email, password } = await c.req.json();
    if (!name || !email || !password) return c.json({ error: 'Name, email and password required' }, 400);
    if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);
    const db = sql(c.env);
    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length) return c.json({ error: 'Email already registered' }, 409);
    const hash = await bcrypt.hash(password, 10);
    const [user] = await db`INSERT INTO users (name, email, password_hash, role, last_seen) VALUES (${name}, ${email}, ${hash}, 'member', NOW()) RETURNING id, name, email, role, avatar, bio, last_seen`;
    const token = jwt.sign({ userId: user.id, role: user.role }, secret(c), { expiresIn: '7d' });
    return c.json({ user, token }, 201);
  } catch (err) { console.error('Register error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
    const db = sql(c.env);
    const [user] = await db`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return c.json({ error: 'Invalid email or password' }, 401);
    const token = jwt.sign({ userId: user.id, role: user.role }, secret(c), { expiresIn: '7d' });
    return c.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, lastSeen: user.last_seen },
      token,
    });
  } catch (err) { console.error('Login error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/auth/me', requireAuth, async (c) => {
  try {
    const u = c.get('user');
    const db = sql(c.env);
    const [user] = await db`SELECT * FROM users WHERE id = ${u.userId} LIMIT 1`;
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, emailVerified: user.email_verified, lastSeen: user.last_seen });
  } catch (err) { console.error('Me error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Posts ─────────────────────────────────────────────────────────
app.get('/api/posts', async (c) => {
  try {
    const db = sql(c.env);
    const posts = await db`SELECT p.*, u.name as author_name, u.role as author_role, u.avatar as author_avatar,
      (SELECT count(*)::int FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p LEFT JOIN users u ON u.id = p.author_id ORDER BY p.pinned DESC, p.created_at DESC`;
    return c.json(posts.map(p => ({ ...p, likeCount: 0 })));
  } catch (err) { console.error('Posts error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/posts', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { text, imageUrl } = await c.req.json();
    if (!text) return c.json({ error: 'Text is required' }, 400);
    const db = sql(c.env);
    const [post] = await db`INSERT INTO posts (author_id, text, image_url) VALUES (${user.userId}, ${text}, ${imageUrl || null}) RETURNING *`;
    return c.json(post, 201);
  } catch (err) { console.error('Create post error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.delete('/api/posts/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [post] = await db`SELECT * FROM posts WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!post) return c.json({ error: 'Post not found' }, 404);
    if (post.author_id !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db`DELETE FROM posts WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Delete post error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/posts/:id/pin', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    const { pinned } = await c.req.json();
    const db = sql(c.env);
    await db`UPDATE posts SET pinned = ${pinned === true} WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Pin error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Comments ──────────────────────────────────────────────────────
app.get('/api/posts/:postId/comments', async (c) => {
  try {
    const db = sql(c.env);
    const comments = await db`SELECT c.*, u.name as author_name, u.role as author_role, u.avatar as author_avatar
      FROM comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.post_id = ${c.req.param('postId')} ORDER BY c.created_at ASC`;
    return c.json(comments);
  } catch (err) { console.error('Comments error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/posts/:postId/comments', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Text is required' }, 400);
    const db = sql(c.env);
    const [cm] = await db`INSERT INTO comments (post_id, author_id, text) VALUES (${c.req.param('postId')}, ${user.userId}, ${text}) RETURNING *`;
    return c.json(cm, 201);
  } catch (err) { console.error('Create comment error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.delete('/api/comments/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [cm] = await db`SELECT * FROM comments WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!cm) return c.json({ error: 'Comment not found' }, 404);
    if (cm.author_id !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db`DELETE FROM comments WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Delete comment error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Events ────────────────────────────────────────────────────────
app.get('/api/events', async (c) => {
  try {
    const db = sql(c.env);
    const events = await db`SELECT e.*, u.name as author_name, u.role as author_role FROM events e LEFT JOIN users u ON u.id = e.author_id ORDER BY e.created_at DESC`;
    return c.json(events);
  } catch (err) { console.error('Events error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/events', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const { title, date, description, link } = await c.req.json();
    if (!title || !date) return c.json({ error: 'Title and date required' }, 400);
    const db = sql(c.env);
    const [ev] = await db`INSERT INTO events (author_id, title, date, description, link) VALUES (${user.userId}, ${title}, ${date}, ${description||null}, ${link||null}) RETURNING *`;
    return c.json(ev, 201);
  } catch (err) { console.error('Create event error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.delete('/api/events/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const db = sql(c.env);
    const [ev] = await db`SELECT * FROM events WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!ev) return c.json({ error: 'Event not found' }, 404);
    if (ev.author_id !== user.userId && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    await db`DELETE FROM events WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Delete event error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Announcements ─────────────────────────────────────────────────
app.get('/api/announcements', async (c) => {
  try {
    const db = sql(c.env);
    const anns = await db`SELECT a.*, u.name as author_name, u.role as author_role FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.created_at DESC`;
    return c.json(anns);
  } catch (err) { console.error('Announcements error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/announcements', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const { title, body } = await c.req.json();
    if (!title || !body) return c.json({ error: 'Title and body required' }, 400);
    const db = sql(c.env);
    const [ann] = await db`INSERT INTO announcements (author_id, title, body) VALUES (${user.userId}, ${title}, ${body}) RETURNING *`;
    return c.json(ann, 201);
  } catch (err) { console.error('Create announcement error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.delete('/api/announcements/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    const db = sql(c.env);
    const [ann] = await db`SELECT * FROM announcements WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!ann) return c.json({ error: 'Announcement not found' }, 404);
    if (ann.author_id !== user.userId && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    await db`DELETE FROM announcements WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Delete announcement error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Chat ──────────────────────────────────────────────────────────
app.get('/api/chat', async (c) => {
  try {
    const db = sql(c.env);
    const messages = await db`SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 80`;
    return c.json(messages.reverse());
  } catch (err) { console.error('Chat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/chat', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Text is required' }, 400);
    const db = sql(c.env);
    const [usr] = await db`SELECT name, role, avatar FROM users WHERE id = ${user.userId} LIMIT 1`;
    if (!usr) return c.json({ error: 'User not found' }, 404);
    const [msg] = await db`INSERT INTO chat_messages (sender_id, sender_name, sender_role, sender_avatar, text) VALUES (${user.userId}, ${usr.name}, ${usr.role}, ${usr.avatar}, ${text}) RETURNING *`;
    return c.json(msg, 201);
  } catch (err) { console.error('Send chat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.delete('/api/chat/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [msg] = await db`SELECT * FROM chat_messages WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!msg) return c.json({ error: 'Message not found' }, 404);
    if (msg.sender_id !== user.userId && user.role === 'member') return c.json({ error: 'Forbidden' }, 403);
    await db`DELETE FROM chat_messages WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Delete chat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Notifications ─────────────────────────────────────────────────
app.get('/api/notifications', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const notifs = await db`SELECT * FROM notifications WHERE user_id = ${user.userId} ORDER BY created_at DESC LIMIT 50`;
    return c.json(notifs);
  } catch (err) { console.error('Notifications error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/notifications/read-all', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    await db`UPDATE notifications SET read = true WHERE user_id = ${user.userId}`;
    return c.json({ success: true });
  } catch (err) { console.error('Read all error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/notifications/:id/read', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [notif] = await db`SELECT * FROM notifications WHERE id = ${c.req.param('id')} AND user_id = ${user.userId} LIMIT 1`;
    if (!notif) return c.json({ error: 'Notification not found' }, 404);
    await db`UPDATE notifications SET read = true WHERE id = ${c.req.param('id')}`;
    return c.json({ success: true });
  } catch (err) { console.error('Read notif error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/notifications/broadcast', requireAuth, requireRole('admin'), async (c) => {
  try {
    const { title, message } = await c.req.json();
    if (!title || !message) return c.json({ error: 'Title and message required' }, 400);
    const db = sql(c.env);
    const users = await db`SELECT id FROM users`;
    for (const u of users) {
      await db`INSERT INTO notifications (user_id, title, message, type) VALUES (${u.id}, ${title}, ${message}, 'broadcast')`;
    }
    return c.json({ success: true, count: users.length });
  } catch (err) { console.error('Broadcast error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Users ─────────────────────────────────────────────────────────
app.get('/api/users', async (c) => {
  try {
    const db = sql(c.env);
    const users = await db`SELECT id, name, email, role, avatar, bio, email_verified as "emailVerified", last_seen as "lastSeen", created_at as "createdAt" FROM users ORDER BY name ASC`;
    return c.json(users);
  } catch (err) { console.error('Users error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/users/:id', async (c) => {
  try {
    const db = sql(c.env);
    const [user] = await db`SELECT id, name, email, role, avatar, bio, email_verified, last_seen, created_at FROM users WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
  } catch (err) { console.error('Get user error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.patch('/api/users/:id', requireAuth, async (c) => {
  try {
    const authedUser = c.get('user');
    const db = sql(c.env);
    const [target] = await db`SELECT * FROM users WHERE id = ${c.req.param('id')} LIMIT 1`;
    if (!target) return c.json({ error: 'User not found' }, 404);
    if (authedUser.userId !== c.req.param('id') && authedUser.role !== 'admin')
      return c.json({ error: 'Forbidden' }, 403);
    const body = await c.req.json();
    const sets = [];
    const vals = [];
    let idx = 1;
    if (body.name !== undefined) { sets.push(`name = \${${idx}}`); vals.push(body.name); idx++; }
    if (body.bio !== undefined) { sets.push(`bio = \${${idx}}`); vals.push(body.bio); idx++; }
    if (body.avatar !== undefined) { sets.push(`avatar = \${${idx}}`); vals.push(body.avatar); idx++; }
    if (body.role !== undefined && authedUser.role === 'admin') { sets.push(`role = \${${idx}}`); vals.push(body.role); idx++; }
    if (!sets.length) return c.json({ error: 'No valid fields to update' }, 400);
    vals.push(c.req.param('id'));
    const [updated] = await db.unsafe(`UPDATE users SET ${sets.join(', ')} WHERE id = \${${idx}} RETURNING id, name, email, role, avatar, bio, last_seen, created_at`, ...vals);
    return c.json(updated);
  } catch (err) { console.error('Update user error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── DM ────────────────────────────────────────────────────────────
app.get('/api/dm/threads', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const threads = await db`SELECT * FROM dm_threads WHERE participant1 = ${user.userId} OR participant2 = ${user.userId} ORDER BY last_message_at DESC NULLS LAST`;
    const enriched = await Promise.all(threads.map(async (t) => {
      const otherId = t.participant1 === user.userId ? t.participant2 : t.participant1;
      const [other] = await db`SELECT id, name, avatar FROM users WHERE id = ${otherId} LIMIT 1`;
      const [lastMsg] = await db`SELECT * FROM dm_messages WHERE thread_id = ${t.id} ORDER BY created_at DESC LIMIT 1`;
      return { id: t.id, otherUser: other || { id: otherId, name: 'Unknown' }, lastMessage: lastMsg || null, lastMessageAt: t.last_message_at };
    }));
    return c.json(enriched);
  } catch (err) { console.error('DM threads error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/dm/threads/:threadId/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [thread] = await db`SELECT * FROM dm_threads WHERE id = ${c.req.param('threadId')} LIMIT 1`;
    if (!thread || (thread.participant1 !== user.userId && thread.participant2 !== user.userId))
      return c.json({ error: 'Thread not found' }, 404);
    const messages = await db`SELECT * FROM dm_messages WHERE thread_id = ${c.req.param('threadId')} ORDER BY created_at ASC`;
    return c.json(messages);
  } catch (err) { console.error('DM messages error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

app.post('/api/dm/threads/:threadId/messages', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    const [thread] = await db`SELECT * FROM dm_threads WHERE id = ${c.req.param('threadId')} LIMIT 1`;
    if (!thread || (thread.participant1 !== user.userId && thread.participant2 !== user.userId))
      return c.json({ error: 'Thread not found' }, 404);
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Text is required' }, 400);
    const [msg] = await db`INSERT INTO dm_messages (thread_id, sender_id, text) VALUES (${c.req.param('threadId')}, ${user.userId}, ${text}) RETURNING *`;
    await db`UPDATE dm_threads SET last_message_at = NOW() WHERE id = ${c.req.param('threadId')}`;
    return c.json(msg, 201);
  } catch (err) { console.error('Send DM error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Heartbeat ─────────────────────────────────────────────────────
app.post('/api/heartbeat', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = sql(c.env);
    await db`UPDATE users SET last_seen = NOW() WHERE id = ${user.userId}`;
    return c.json({ ok: true });
  } catch (err) { console.error('Heartbeat error:', err); return c.json({ error: 'Internal server error' }, 500); }
});

export default app;
