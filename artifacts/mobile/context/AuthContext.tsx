import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, setApiToken } from "@/lib/api";
import type { UserProfile } from "@/types";

const TOKEN_KEY = "@yourcommunity/token";

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapApiUser(u: any): UserProfile {
  return {
    uid: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified === "true" || u.emailVerified === true,
    role: u.role ?? "member",
    avatar: u.avatar ?? null,
    bio: u.bio ?? "",
    fcmToken: null,
    lastSeen: u.lastSeen ?? undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          setApiToken(token);
          const me = await api.auth.me();
          setProfile(mapApiUser(me));
        }
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setApiToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user, token } = await api.auth.login(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setApiToken(token);
    setProfile(mapApiUser(user));
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user, token } = await api.auth.register(name, email, password);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setApiToken(token);
    setProfile(mapApiUser(user));
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setApiToken(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = await api.users.update(profile.uid, {
      name: data.name,
      bio: data.bio,
      avatar: data.avatar,
      role: data.role,
    });
    setProfile(mapApiUser(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
