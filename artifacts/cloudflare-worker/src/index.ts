import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./routes/auth";
import postsRoutes from "./routes/posts";
import commentsRoutes from "./routes/comments";
import eventsRoutes from "./routes/events";
import announcementsRoutes from "./routes/announcements";
import chatRoutes from "./routes/chat";
import notificationsRoutes from "./routes/notifications";
import usersRoutes from "./routes/users";
import dmRoutes from "./routes/dm";
import heartbeatRoutes from "./routes/heartbeat";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: string;
    role: "admin" | "moderator" | "member";
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/*", cors());

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api", authRoutes);
app.route("/api", postsRoutes);
app.route("/api", commentsRoutes);
app.route("/api", eventsRoutes);
app.route("/api", announcementsRoutes);
app.route("/api", chatRoutes);
app.route("/api", notificationsRoutes);
app.route("/api", usersRoutes);
app.route("/api", dmRoutes);
app.route("/api", heartbeatRoutes);

export default app;
