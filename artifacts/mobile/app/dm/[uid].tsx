import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/timeAgo";
import { db } from "@/lib/firebase";
import type { DMMessage, UserProfile } from "@/types";

function getThreadId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export default function DMThreadScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const threadId = user && uid ? getThreadId(user.uid, uid) : null;

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        const u = { uid: snap.id, ...snap.data() } as UserProfile;
        setOtherUser(u);
        navigation.setOptions({ title: u.name });
      }
    });
  }, [uid]);

  useEffect(() => {
    if (!threadId) return;
    const q = query(
      collection(db, "dmThreads", threadId, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DMMessage)));
      setLoading(false);
    });
    return () => unsub();
  }, [threadId]);

  const handleSend = async () => {
    if (!text.trim() || !profile || !threadId || !uid) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "dmThreads", threadId, "messages"), {
        senderId: profile.uid,
        senderName: profile.name,
        text: msgText,
        createdAt: Date.now(),
      });
      await setDoc(
        doc(db, "dmThreads", threadId),
        {
          memberId: profile.role !== "admin" ? profile.uid : uid,
          memberName: profile.role !== "admin" ? profile.name : otherUser?.name ?? "",
          memberAvatar: profile.role !== "admin" ? profile.avatar : otherUser?.avatar ?? null,
          adminId: profile.role === "admin" ? profile.uid : uid,
          lastMessage: msgText,
          lastMessageAt: Date.now(),
          unreadForAdmin: profile.role !== "admin" ? 1 : 0,
        },
        { merge: true }
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => {
            const isOwn = item.senderId === profile?.uid;
            return (
              <View
                style={[
                  styles.msgRow,
                  isOwn ? styles.msgRowOwn : styles.msgRowOther,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isOwn ? colors.primary : colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      { color: isOwn ? "#fff" : colors.foreground },
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.msgTime, { color: colors.mutedForeground }]}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Start the conversation
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.foreground,
              borderColor: colors.border,
              borderRadius: 20,
            },
          ]}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.primary,
              opacity: !text.trim() || sending ? 0.5 : 1,
              borderRadius: 20,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 14 },
  msgRow: { marginHorizontal: 12, marginVertical: 3 },
  msgRowOwn: { alignItems: "flex-end" },
  msgRowOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 0.5,
  },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 11, marginTop: 3, paddingHorizontal: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 0.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
