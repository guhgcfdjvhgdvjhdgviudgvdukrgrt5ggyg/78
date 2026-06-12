import { Feather } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ChatBubble } from "@/components/ChatBubble";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import type { ChatMessage } from "@/types";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      orderBy("createdAt", "desc"),
      limit(80)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSend = async () => {
    if (!text.trim() || !profile || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "chatMessages"), {
        senderId: profile.uid,
        senderName: profile.name,
        senderRole: profile.role,
        senderAvatar: profile.avatar,
        text: msgText,
        createdAt: Date.now(),
      });
    } finally {
      setSending(false);
    }
  };

  const handleLongPress = (msg: ChatMessage) => {
    const canDelete =
      profile?.uid === msg.senderId ||
      profile?.role === "admin" ||
      profile?.role === "moderator";
    if (!canDelete) return;
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDoc(doc(db, "chatMessages", msg.id)),
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 4,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Community Chat
        </Text>
        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
            renderItem={({ item, index }) => {
              const prevMsg = messages[index + 1];
              const showSender = !prevMsg || prevMsg.senderId !== item.senderId;
              return (
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item)}
                  activeOpacity={0.9}
                >
                  <ChatBubble
                    message={item}
                    isOwn={item.senderId === profile?.uid}
                    showSender={showSender}
                  />
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{
              paddingVertical: 12,
              paddingBottom: insets.bottom + 60,
            }}
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
            placeholder="Message the community..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 0.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
