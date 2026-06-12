import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/types";
import { RoleBadge } from "./RoleBadge";
import { timeAgo } from "@/lib/timeAgo";

interface Props {
  post: Post;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string, pinned: boolean) => void;
  onLikeRefresh?: () => void;
}

export function PostCard({ post, onDelete, onPin, onLikeRefresh }: Props) {
  const colors = useColors();
  const { profile } = useAuth();
  const router = useRouter();
  const [liking, setLiking] = useState(false);

  const likes = post.likes ?? [];
  const isLiked = profile ? likes.includes(profile.uid) : false;
  const canModerate =
    profile?.role === "admin" || profile?.role === "moderator";

  const handleLike = async () => {
    if (!profile || liking) return;
    setLiking(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.posts.like(post.id);
      onLikeRefresh?.();
    } catch (e) {
      console.warn("Like error:", e);
    }
    setLiking(false);
  };

  const handleLongPress = () => {
    if (!canModerate && profile?.uid !== post.authorId) return;
    const options: { text: string; style?: "destructive" | "cancel"; onPress: () => void }[] = [];
    if (profile?.role === "admin" && onPin) {
      options.push({
        text: post.pinned ? "Unpin Post" : "Pin Post",
        onPress: () => onPin(post.id, !post.pinned),
      });
    }
    if (canModerate || profile?.uid === post.authorId) {
      options.push({
        text: "Delete Post",
        style: "destructive",
        onPress: () => onDelete?.(post.id),
      });
    }
    options.push({ text: "Cancel", style: "cancel", onPress: () => {} });
    Alert.alert("Post Options", undefined, options);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.97}
      onPress={() => router.push(`/post/${post.id}` as any)}
      onLongPress={handleLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {post.pinned && (
        <View style={[styles.pinnedBanner, { backgroundColor: colors.secondary }]}>
          <Feather name="bookmark" size={11} color={colors.primary} />
          <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
        </View>
      )}
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary, borderRadius: 20 },
          ]}
        >
          {post.authorAvatar ? (
            <Image
              source={{ uri: post.authorAvatar }}
              style={styles.avatarImg}
            />
          ) : (
            <Text style={styles.avatarLetter}>
              {(post.authorName ?? "?")[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>
              {post.authorName ?? "Unknown"}
            </Text>
            <RoleBadge role={post.authorRole} small />
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={[styles.text, { color: colors.foreground }]}>
        {post.text}
      </Text>

      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={[styles.postImage, { borderRadius: colors.radius }]}
          contentFit="cover"
        />
      )}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleLike} style={styles.action} disabled={liking}>
          {liking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#E53935" : colors.mutedForeground}
            />
          )}
          <Text
            style={[
              styles.actionText,
              { color: isLiked ? "#E53935" : colors.mutedForeground },
            ]}
          >
            {post.likeCount ?? likes.length}
          </Text>
        </TouchableOpacity>
        <View style={styles.action}>
          <Ionicons
            name="chatbubble-outline"
            size={19}
            color={colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 40,
    height: 40,
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  authorInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontWeight: "600",
    fontSize: 14,
  },
  time: {
    fontSize: 12,
    marginTop: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  postImage: {
    marginHorizontal: 12,
    marginBottom: 10,
    height: 200,
    width: "auto",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 16,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
