import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { UserProfile, UserRole } from "@/types";

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile: myProfile } = useAuth();
  const [member, setMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.users.get(id)
      .then((data) => setMember({ uid: data.id, ...data } as UserProfile))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChangeRole = () => {
    if (!member) return;
    const roles: UserRole[] = ["member", "moderator", "admin"];
    const options = ["Member", "Moderator", "Admin", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, title: "Change Role" },
        async (idx) => {
          if (idx === 3) return;
          const newRole = roles[idx];
          await api.users.update(member.uid, { role: newRole });
          setMember((m) => m ? { ...m, role: newRole } : m);
        }
      );
    } else {
      Alert.alert("Change Role", "Select a role:", [
        { text: "Member", onPress: async () => { await api.users.update(member.uid, { role: "member" }); setMember((m) => m ? { ...m, role: "member" } : m); } },
        { text: "Moderator", onPress: async () => { await api.users.update(member.uid, { role: "moderator" }); setMember((m) => m ? { ...m, role: "moderator" } : m); } },
        { text: "Admin", onPress: async () => { await api.users.update(member.uid, { role: "admin" }); setMember((m) => m ? { ...m, role: "admin" } : m); } },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const isMyProfile = myProfile?.uid === id;
  const isAdmin = myProfile?.role === "admin";
  const isMember = myProfile?.role === "member";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View
        style={[styles.coverArea, { backgroundColor: colors.primary }]}
      />
      <View style={styles.profileSection}>
        <View
          style={[
            styles.avatarWrap,
            {
              backgroundColor: colors.primary,
              borderRadius: 50,
              borderColor: colors.background,
            },
          ]}
        >
          {member.avatar ? (
            <Image source={{ uri: member.avatar }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarLetter}>
              {member.name[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.nameArea}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {member.name}
          </Text>
          <RoleBadge role={member.role} />
        </View>
        {member.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>
            {member.bio}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {isMember && member.role === "admin" && (
            <TouchableOpacity
              onPress={() => router.push(`/dm/${member.uid}` as any)}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, borderRadius: 20 },
              ]}
            >
              <Feather name="mail" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
          )}
          {isAdmin && !isMyProfile && (
            <TouchableOpacity
              onPress={handleChangeRole}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 0.5,
                  borderRadius: 20,
                },
              ]}
            >
              <Feather name="shield" size={16} color={colors.foreground} />
              <Text style={[styles.actionBtnTextDark, { color: colors.foreground }]}>
                Change Role
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverArea: { height: 120 },
  profileSection: { alignItems: "center", marginTop: -40, paddingHorizontal: 20 },
  avatarWrap: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
  },
  avatar: { width: 90, height: 90 },
  avatarLetter: { color: "#fff", fontWeight: "800", fontSize: 36 },
  nameArea: { alignItems: "center", marginTop: 12, gap: 6 },
  name: { fontSize: 22, fontWeight: "800" },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionBtnTextDark: { fontWeight: "700", fontSize: 14 },
});
