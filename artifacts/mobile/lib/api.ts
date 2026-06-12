function getApiBase(): string {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "/api";
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "http://localhost:8080/api";
}

const API_BASE = getApiBase();
const logPrefix = "[API]";

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

export function getApiToken() {
  return _token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const url = `${API_BASE}${path}`;
  console.log(`${logPrefix} fetch ${options.method || "GET"} ${url}`);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    console.warn(`${logPrefix} error ${res.status}:`, err);
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ user: any; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    me: () => request<any>("/auth/me"),
  },

  posts: {
    list: () => request<any[]>("/posts"),
    create: (text: string, imageUrl?: string | null) =>
      request<any>("/posts", {
        method: "POST",
        body: JSON.stringify({ text, imageUrl }),
      }),
    delete: (id: string) =>
      request<any>(`/posts/${id}`, { method: "DELETE" }),
    pin: (id: string, pinned: boolean) =>
      request<any>(`/posts/${id}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ pinned }),
      }),
  },

  comments: {
    list: (postId: string) => request<any[]>(`/posts/${postId}/comments`),
    create: (postId: string, text: string) =>
      request<any>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    delete: (id: string) =>
      request<any>(`/comments/${id}`, { method: "DELETE" }),
  },

  events: {
    list: () => request<any[]>("/events"),
    create: (data: { title: string; date: string; description?: string; link?: string }) =>
      request<any>("/events", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/events/${id}`, { method: "DELETE" }),
  },

  announcements: {
    list: () => request<any[]>("/announcements"),
    create: (title: string, body: string) =>
      request<any>("/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      }),
    delete: (id: string) =>
      request<any>(`/announcements/${id}`, { method: "DELETE" }),
  },

  chat: {
    list: () => request<any[]>("/chat"),
    send: (text: string) =>
      request<any>("/chat", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    delete: (id: string) =>
      request<any>(`/chat/${id}`, { method: "DELETE" }),
  },

  heartbeat: () => request<any>("/heartbeat", { method: "POST" }),

  users: {
    list: () => request<any[]>("/users"),
    get: (id: string) => request<any>(`/users/${id}`),
    update: (id: string, data: { name?: string; bio?: string; avatar?: string | null; role?: string }) =>
      request<any>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  notifications: {
    list: () => request<any[]>("/notifications"),
    readAll: () =>
      request<any>("/notifications/read-all", { method: "PATCH" }),
    read: (id: string) =>
      request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
    broadcast: (title: string, message: string) =>
      request<any>("/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ title, message }),
      }),
  },

  dm: {
    threads: () => request<any[]>("/dm/threads"),
    messages: (threadId: string) =>
      request<any[]>(`/dm/threads/${threadId}/messages`),
    send: (threadId: string, text: string) =>
      request<any>(`/dm/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
  },
};
