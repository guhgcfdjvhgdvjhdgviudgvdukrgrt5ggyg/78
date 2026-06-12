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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { Announcement } from "@/types";

export default function AdminAnnouncementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const all = await adminApi.announcements.list();
      setAnnouncements(all);
    } catch (err) {
      console.warn("Admin announcements fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [fetchAnnouncements])
  );

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.announcements.create(title.trim(), body.trim());
      setTitle("");
      setBody("");
      fetchAnnouncements();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (ann: Announcement) => {
    Alert.alert("Delete Announcement", `Delete "${ann.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.announcements.delete(ann.id);
            setAnnouncements((prev) => prev.filter((a) => a.id !== ann.id));
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Failed to delete announcement.");
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={announcements}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View style={[styles.createForm, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              NEW ANNOUNCEMENT
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.card }]}
              placeholder="Title"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}
              placeholder="Body"
              placeholderTextColor={colors.mutedForeground}
              value={body}
              onChangeText={setBody}
              multiline
            />
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary, borderRadius: 20, opacity: saving ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Post Announcement</Text>
              )}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.annCard, { borderBottomColor: colors.border }]}>
            <View style={styles.annHeader}>
              <Feather name="bell" size={16} color={colors.primary} />
              <Text style={[styles.annTitle, { color: colors.foreground }]}>
                {item.title}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Feather name="trash-2" size={14} color={colors.destructive} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.annBody, { color: colors.mutedForeground }]}>
              {item.body}
            </Text>
            <Text style={[styles.annDate, { color: colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onRefresh={fetchAnnouncements}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  createForm: {
    padding: 16,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 0.5,
  },
  textarea: {
    height: 100,
    padding: 14,
    fontSize: 15,
    borderWidth: 0.5,
    textAlignVertical: "top",
  },
  createBtn: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  annCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  annHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  annTitle: { fontWeight: "700", fontSize: 15, flex: 1 },
  deleteBtn: { padding: 4 },
  annBody: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  annDate: { fontSize: 12, marginTop: 4 },
});
