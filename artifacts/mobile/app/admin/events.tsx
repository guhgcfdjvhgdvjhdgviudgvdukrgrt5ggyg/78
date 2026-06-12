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
import type { Event } from "@/types";

export default function AdminEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const all = await adminApi.events.list();
      setEvents(all);
    } catch (err) {
      console.warn("Admin events fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const handleDelete = (ev: Event) => {
    Alert.alert("Delete Event", `Delete "${ev.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.events.delete(ev.id);
            setEvents((prev) => prev.filter((e) => e.id !== ev.id));
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Failed to delete event.");
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

  if (events.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="calendar" size={48} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No events</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderBottomColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  {item.title}
                </Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  {" "}
                  {new Date(item.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.deleteBtn}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
            {item.description ? (
              <Text
                style={[styles.desc, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            ) : null}
            <Text style={[styles.creator, { color: colors.mutedForeground }]}>
              Created by: {item.createdBy?.slice(0, 8)}...
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onRefresh={fetchEvents}
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
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardInfo: { flex: 1, gap: 4 },
  title: { fontWeight: "700", fontSize: 16 },
  date: { fontSize: 13 },
  deleteBtn: { padding: 4 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  creator: { fontSize: 12, marginTop: 6 },
});
