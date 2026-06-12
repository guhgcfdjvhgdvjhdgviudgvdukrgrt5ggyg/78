import { Feather } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  doc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotifRow } from "@/components/NotifRow";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import type { AppNotification } from "@/types";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        batch.update(doc(db, "notifications", user.uid, "items", n.id), {
          read: true,
        });
      });
    await batch.commit();
  };

  const handlePress = async (n: AppNotification) => {
    if (!user || n.read) return;
    await updateDoc(doc(db, "notifications", user.uid, "items", n.id), {
      read: true,
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markBtn}>
            <Text style={[styles.markText, { color: colors.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bell" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotifRow notification={item} onPress={handlePress} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  title: { fontWeight: "700", fontSize: 20 },
  markBtn: { padding: 4 },
  markText: { fontSize: 14, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
});
