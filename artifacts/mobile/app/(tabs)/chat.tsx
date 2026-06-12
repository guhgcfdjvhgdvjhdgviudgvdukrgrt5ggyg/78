import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import type { ChatMessage } from "@/types";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [allMessages, allUsers] = await Promise.all([
        api.chat.list(),
        api.users.list(),
      ]);
      setMessages(allMessages);
      const now = Date.now();
      const online = new Set<string>();
      for (const u of allUsers) {
        if (u.lastSeen) {
          const lastSeen = new Date(u.lastSeen).getTime();
          if (now - lastSeen < ONLINE_THRESHOLD_MS) {
            online.add(u.id);
          }
        }
      }
      setOnlineUsers(online);
      setError(null);
    } catch (err) {
      console.warn("Chat fetch error:", err);
      setError("Could not load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      api.heartbeat().catch(() => {});
      const interval = setInterval(() => {
        api.heartbeat().catch(() => {});
      }, 60000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleSend = async () => {
    if (!text.trim() || !profile || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await api.chat.send(msgText);
    } catch (e) {
      console.warn("Send message error:", e);
      Alert.alert("Error", "Failed to send message.");
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
        onPress: async () => {
          try {
            await api.chat.delete(msg.id);
          } catch (e) {
            console.warn("Delete message error:", e);
            Alert.alert("Error", "Failed to delete message.");
          }
        },
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
        ) : error ? (
          <View style={styles.center}>
            <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={fetchData} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Send the first message to the community!
            </Text>
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
                    online={onlineUsers.has(item.senderId)}
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
  emptyText: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 6, opacity: 0.7 },
  retryBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
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
