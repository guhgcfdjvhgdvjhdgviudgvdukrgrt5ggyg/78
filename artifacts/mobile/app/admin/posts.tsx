import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { RoleBadge } from "@/components/RoleBadge";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/types";

export default function AdminPostsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const all = await adminApi.posts.list();
      const sorted = [
        ...all.filter((p: Post) => p.pinned),
        ...all.filter((p: Post) => !p.pinned),
      ];
      setPosts(sorted);
    } catch (err) {
      console.warn("Admin posts fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const handleDelete = (post: Post) => {
    Alert.alert("Delete Post", `Delete post by ${post.authorName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.posts.delete(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Failed to delete post.");
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

  if (posts.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="file-text" size={48} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={[styles.postCard, { borderBottomColor: colors.border }]}>
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: 20 }]}>
                <Text style={styles.avatarLetter}>
                  {item.authorName[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.postMeta}>
                <View style={styles.authorRow}>
                  <Text style={[styles.authorName, { color: colors.foreground }]}>
                    {item.authorName}
                  </Text>
                  <RoleBadge role={item.authorRole} small />
                </View>
                <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {item.pinned && (
                <Feather name="bookmark" size={14} color={colors.primary} />
              )}
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.deleteBtn}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.postText, { color: colors.foreground }]}
              numberOfLines={3}
            >
              {item.text}
            </Text>

            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.postImage, { borderRadius: colors.radius }]}
                contentFit="cover"
              />
            )}

            <View style={styles.postStats}>
              <Feather name="heart" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {item.likes?.length ?? 0}
              </Text>
              <Feather name="message-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {item.commentCount ?? 0}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onRefresh={fetchPosts}
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
  postCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 14 },
  postMeta: { flex: 1 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontWeight: "600", fontSize: 14 },
  postTime: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 4 },
  postText: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  postImage: { width: "100%", height: 180, marginTop: 8 },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  statText: { fontSize: 12, marginRight: 12 },
});
