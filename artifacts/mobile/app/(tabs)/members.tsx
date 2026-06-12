import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberRow } from "@/components/MemberRow";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      const allMembers = snap.docs.map(
        (d) => ({ uid: d.id, ...d.data() } as UserProfile)
      );
      allMembers.sort((a, b) => {
        const order = { admin: 0, moderator: 1, member: 2 };
        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
      });
      setMembers(allMembers);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () =>
      search.trim()
        ? members.filter((m) =>
            m.name.toLowerCase().includes(search.toLowerCase())
          )
        : members,
    [members, search]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          Members
          {!loading && (
            <Text style={{ color: colors.mutedForeground, fontWeight: "400", fontSize: 15 }}>
              {" "}
              ({members.length})
            </Text>
          )}
        </Text>
      </View>

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
          placeholder="Search members..."
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
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search ? "No members found" : "No members yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.uid}
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              onPress={(m) => router.push(`/member/${m.uid}` as any)}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
});
