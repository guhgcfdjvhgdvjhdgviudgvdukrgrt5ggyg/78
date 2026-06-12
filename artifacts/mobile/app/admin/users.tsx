import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { adminApi } from "@/lib/api";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleBadge } from "@/components/RoleBadge";
import { useColors } from "@/hooks/useColors";
import type { UserProfile, UserRole } from "@/types";

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const all = await adminApi.users.list();
      const order: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
      all.sort((a: UserProfile, b: UserProfile) => (order[a.role] ?? 3) - (order[b.role] ?? 3));
      setUsers(all);
    } catch (err) {
      console.warn("Admin users fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  const filtered = search.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users;

  const handleSave = async () => {
    if (!selected) return;
    if (newRole === selected.role) {
      setSelected(null);
      return;
    }
    setSaving(true);
    try {
      await adminApi.users.update(selected.uid, { role: newRole });
      setSelected(null);
      fetchUsers();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const roles: UserRole[] = ["member", "moderator", "admin"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: 20,
          },
        ]}
      >
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search users..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSelected(item);
                setNewRole(item.role);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: 24 }]}>
                <Text style={styles.avatarLetter}>
                  {item.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground }]}>
                  {item.email}
                </Text>
              </View>
              <RoleBadge role={item.role} />
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          onRefresh={fetchUsers}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit User</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1, borderRadius: 20 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>NAME</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>{selected?.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>EMAIL</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>{selected?.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>BIO</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {selected?.bio || "No bio"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>LAST SEEN</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {selected?.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "Unknown"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>ROLE</Text>
              <View style={styles.rolePicker}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: newRole === r ? colors.primary : colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                      },
                    ]}
                    onPress={() => setNewRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        { color: newRole === r ? "#fff" : colors.foreground },
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 0.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 17 },
  info: { flex: 1 },
  name: { fontWeight: "600", fontSize: 15 },
  email: { fontSize: 13, marginTop: 2 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 15 },
  modalTitle: { fontWeight: "700", fontSize: 16 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  detailRow: { gap: 4 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  value: { fontSize: 15 },
  rolePicker: { flexDirection: "row", gap: 8, marginTop: 4 },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 0.5,
  },
  roleOptionText: { fontWeight: "600", fontSize: 14 },
});
