import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminBroadcastModal } from "@/components/AdminBroadcastModal";
import { NewPostModal } from "@/components/NewPostModal";
import { PostCard } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/types";
import { useRouter } from "expo-router";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const allPosts = await api.posts.list();
      const sorted = [
        ...allPosts.filter((p: Post) => p.pinned),
        ...allPosts.filter((p: Post) => !p.pinned),
      ];
      setPosts(sorted);
    } catch (err) {
      console.warn("Feed fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  const handleDelete = async (postId: string) => {
    try {
      await api.posts.delete(postId);
    } catch (e) {
      console.warn("Delete post error:", e);
      Alert.alert("Error", "Failed to delete post.");
    }
  };

  const handlePin = async (postId: string, pinned: boolean) => {
    try {
      await api.posts.pin(postId, pinned);
    } catch (e) {
      console.warn("Pin post error:", e);
      Alert.alert("Error", "Failed to pin/unpin post.");
    }
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
          Community Feed
        </Text>
        <View style={styles.headerActions}>
          {profile?.role === "admin" && (
            <TouchableOpacity
              onPress={() => setShowBroadcast(true)}
              style={styles.headerBtn}
            >
              <Feather name="radio" size={22} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={styles.headerBtn}
          >
            <Feather name="bell" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Feather name="file-text" size={44} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No posts yet. Be the first!
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onDelete={handleDelete}
              onPin={handlePin}
              onLikeRefresh={fetchPosts}
            />
          )}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 90,
          }}
          onRefresh={() => { setRefreshing(true); fetchPosts(); }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      {profile?.role !== "member" && (
        <TouchableOpacity
          onPress={() => setShowNewPost(true)}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + 80,
            },
          ]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <NewPostModal
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
      />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingBottom: 60,
  },
  emptyText: { fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
