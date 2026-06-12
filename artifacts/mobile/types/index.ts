export type UserRole = "admin" | "moderator" | "member";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  avatar: string | null;
  bio: string;
  fcmToken: string | null;
  lastSeen?: string;
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string | null;
  text: string;
  imageUrl: string | null;
  likes: string[];
  commentCount: number;
  createdAt: number;
  pinned: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string | null;
  text: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string | null;
  text: string;
  createdAt: number;
}

export interface Event {
  id: string;
  title: string;
  date: number;
  description: string;
  link: string;
  createdBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  pinned: boolean;
}

export interface AppNotification {
  id: string;
  type: "post" | "comment" | "dm" | "event" | "broadcast";
  message: string;
  read: boolean;
  createdAt: number;
  targetId?: string;
}

export interface DMThread {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  adminId: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadForAdmin: number;
}

export interface DMMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}
