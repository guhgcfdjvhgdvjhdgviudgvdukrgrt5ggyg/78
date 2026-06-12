import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { adminApi } from "@/lib/api";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { ChatMessage } from "@/types";

export default function AdminChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const all = await adminApi.chat.list();
      setMessages(all);
    } catch (err) {
      console.warn("Admin chat fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  const handleDelete = (msg: ChatMessage) => {
    Alert.alert("Delete Message", `Delete message from ${msg.senderName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.chat.delete(msg.id);
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Failed to delete message.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="message-circle" size={48} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.msgRow, { borderBottomColor: colors.border }]}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: 20 }]}>
              <Text style={styles.avatarLetter}>
                {item.senderName[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.msgInfo}>
              <View style={styles.msgHeader}>
                <Text style={[styles.senderName, { color: colors.foreground }]}>
                  {item.senderName}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <Text
                style={[styles.msgText, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
            </View>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onRefresh={fetchMessages}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, marginTop: 12 },
  msgRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 16 },
  msgInfo: { flex: 1 },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  senderName: { fontWeight: "600", fontSize: 14 },
  time: { fontSize: 12 },
  msgText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
