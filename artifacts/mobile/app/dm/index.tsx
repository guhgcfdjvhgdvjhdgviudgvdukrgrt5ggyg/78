import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/timeAgo";
import type { DMThread } from "@/types";

export default function DMInboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    try {
      const allThreads = await api.dm.threads();
      setThreads(allThreads);
    } catch (err) {
      console.warn("DM threads fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 5000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Messages
        </Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No messages yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.thread, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/dm/${item.memberId}` as any)}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primary, borderRadius: 24 },
                ]}
              >
                {item.memberAvatar ? (
                  <Image source={{ uri: item.memberAvatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>
                    {item.memberName[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.threadInfo}>
                <View style={styles.threadTop}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {item.memberName}
                  </Text>
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {timeAgo(item.lastMessageAt)}
                  </Text>
                </View>
                <Text
                  style={[styles.lastMsg, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>
              {item.unreadForAdmin > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.badgeText}>{item.unreadForAdmin}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  title: { fontWeight: "700", fontSize: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  thread: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 19 },
  threadInfo: { flex: 1 },
  threadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberName: { fontWeight: "700", fontSize: 15 },
  time: { fontSize: 12 },
  lastMsg: { fontSize: 13, marginTop: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
