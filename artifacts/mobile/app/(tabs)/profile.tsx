import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { AdminBroadcastModal } from "@/components/AdminBroadcastModal";
import { PostCard } from "@/components/PostCard";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/types";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, signOut, updateProfile } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isAdmin = profile?.role === "admin";

  const fetchMyPosts = useCallback(async () => {
    if (!profile) return;
    try {
      const allPosts = await api.posts.list();
      const filtered = allPosts.filter((p: Post) => p.authorId === profile.uid);
      setMyPosts(filtered);
    } catch (err) {
      console.warn("Profile posts fetch error:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [profile?.uid]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const openEdit = () => {
    setEditName(profile?.name ?? "");
    setEditBio(profile?.bio ?? "");
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    await updateProfile({ name: editName.trim(), bio: editBio.trim() });
    setSaving(false);
    setShowEdit(false);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !profile) return;
    setUploadingAvatar(true);
    try {
      await updateProfile({ avatar: result.assets[0].uri });
    } catch {
      Alert.alert("Error", "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

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
          Profile
        </Text>
        <TouchableOpacity onPress={openEdit} style={styles.headerBtn}>
          <Feather name="edit-2" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} disabled={uploadingAvatar}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary, borderRadius: 44 },
              ]}
            >
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {profile?.name[0]?.toUpperCase()}
                </Text>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: colors.foreground }]}>
            {profile?.name}
          </Text>
          <RoleBadge role={profile?.role ?? "member"} />
          {profile?.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>
              {profile.bio}
            </Text>
          ) : null}
        </View>

        {isAdmin && (
          <View style={[styles.adminSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              ADMIN PANEL
            </Text>
            <TouchableOpacity
              onPress={() => setShowBroadcast(true)}
              style={[
                styles.adminBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="radio" size={18} color={colors.primary} />
              <Text style={[styles.adminBtnText, { color: colors.primary }]}>
                Send Broadcast
              </Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/dm" as any)}
              style={[
                styles.adminBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="inbox" size={18} color={colors.primary} />
              <Text style={[styles.adminBtnText, { color: colors.primary }]}>
                Message Inbox
              </Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.settingsSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            SETTINGS
          </Text>
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.settingText, { color: colors.destructive }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {myPosts.length > 0 && (
          <View style={styles.postsSection}>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 16 }]}
            >
              MY POSTS ({myPosts.length})
            </Text>
            {myPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEdit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEdit(false)}
      >
        <View
          style={[
            styles.editModal,
            {
              backgroundColor: colors.background,
              paddingTop: Platform.OS === "ios" ? 0 : insets.top + 10,
            },
          ]}
        >
          <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.editModalTitle, { color: colors.foreground }]}>
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={saveEdit}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.editBody}>
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
              NAME
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: 20,
                  backgroundColor: colors.card,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.editLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
              BIO
            </Text>
            <TextInput
              style={[
                styles.editTextarea,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  backgroundColor: colors.card,
                },
              ]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell the community about yourself..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </View>
        </View>
      </Modal>

      <AdminBroadcastModal
        visible={showBroadcast}
        onClose={() => setShowBroadcast(false)}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerBtn: { padding: 4 },
  profileCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatar: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 88, height: 88 },
  avatarLetter: { color: "#fff", fontWeight: "800", fontSize: 34 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 22, fontWeight: "800" },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  adminSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  adminBtnText: { flex: 1, fontWeight: "600", fontSize: 15 },
  settingsSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0,
  },
  settingText: { fontSize: 15, fontWeight: "500" },
  postsSection: { paddingTop: 16 },
  editModal: { flex: 1 },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 15 },
  editModalTitle: { fontWeight: "700", fontSize: 16 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  editBody: { padding: 16 },
  editLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  editInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 0.5,
  },
  editTextarea: {
    height: 100,
    padding: 14,
    fontSize: 15,
    borderWidth: 0.5,
    textAlignVertical: "top",
  },
});
