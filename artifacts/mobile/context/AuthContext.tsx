import { Feather } from "@expo/vector-icons";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import type { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function SetupScreen() {
  return (
    <ScrollView contentContainerStyle={styles.setupContainer}>
      <View style={styles.setupIconWrap}>
        <Feather name="settings" size={40} color="#185FA5" />
      </View>
      <Text style={styles.setupTitle}>Firebase Setup Required</Text>
      <Text style={styles.setupBody}>
        Your app needs Firebase credentials to work. Follow these steps to
        configure it:
      </Text>

      {[
        "Go to console.firebase.google.com",
        "Create a project (or select an existing one)",
        "Enable Authentication → Email/Password sign-in",
        "Enable Firestore Database",
        "Enable Storage",
        "Go to Project Settings → General → Your Apps",
        "Copy the config values into Replit Secrets (see keys below)",
      ].map((step, i) => (
        <View key={i} style={styles.setupStep}>
          <View style={styles.setupStepNum}>
            <Text style={styles.setupStepNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.setupStepText}>{step}</Text>
        </View>
      ))}

      <View style={styles.setupEnvBox}>
        {[
          "EXPO_PUBLIC_FIREBASE_API_KEY",
          "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
          "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
          "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
          "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
          "EXPO_PUBLIC_FIREBASE_APP_ID",
        ].map((key) => (
          <Text key={key} style={styles.setupEnvKey}>
            {key}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL("https://console.firebase.google.com")}
        style={styles.setupBtn}
      >
        <Feather name="external-link" size={16} color="#fff" />
        <Text style={styles.setupBtnText}>Open Firebase Console</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ConnectedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        profileUnsubRef.current = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const newProfile: Omit<UserProfile, "uid"> = {
      name,
      email,
      role: "member",
      avatar: null,
      bio: "",
      fcmToken: null,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", newUser.uid), newProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), data);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isFirebaseConfigured) {
    return <SetupScreen />;
  }
  return <ConnectedAuthProvider>{children}</ConnectedAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

const styles = StyleSheet.create({
  setupContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  setupIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EBF3FC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  setupBody: {
    fontSize: 14,
    color: "#6B6B66",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  setupStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    width: "100%",
  },
  setupStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#185FA5",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  setupStepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  setupStepText: { flex: 1, fontSize: 14, color: "#1A1A1A", lineHeight: 22 },
  setupEnvBox: {
    backgroundColor: "#F8F8F6",
    borderRadius: 10,
    padding: 14,
    width: "100%",
    marginTop: 16,
    marginBottom: 24,
    gap: 6,
  },
  setupEnvKey: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#185FA5",
  },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#185FA5",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
  },
  setupBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
