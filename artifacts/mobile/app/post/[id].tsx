import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/timeAgo";
import { db } from "@/lib/firebase";
import type { Comment, Post } from "@/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "posts", id)).then((snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() } as Post);
      setLoading(false);
    });
    const q = query(
      collection(db, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Comment))
          .filter((c) => c.postId === id)
      );
    });
    return () => unsub();
  }, [id]);

  const handleComment = async () => {
    if (!text.trim() || !profile || !id) return;
    setSending(true);
    try {
      await addDoc(collection(db, "comments"), {
        postId: id,
        authorId: profile.uid,
        authorName: profile.name,
        authorRole: profile.role,
        authorAvatar: profile.avatar,
        text: text.trim(),
        createdAt: Date.now(),
      });
      await updateDoc(doc(db, "posts", id), {
        commentCount: increment(1),
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (commentId: string, authorId: string) => {
    const canDelete =
      profile?.uid === authorId ||
      profile?.role === "admin" ||
      profile?.role === "moderator";
    if (!canDelete) return;
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "comments", commentId));
          if (id) {
            await updateDoc(doc(db, "posts", id), {
              commentCount: increment(-1),
            });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const listData = comments as (Comment | "header")[];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          post ? (
            <View
              style={[
                styles.postContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.postHeader}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.primary, borderRadius: 20 },
                  ]}
                >
                  <Text style={styles.avatarLetter}>
                    {post.authorName[0]?.toUpperCase()}
                  </Text>
                </View>
                <View>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.authorName, { color: colors.foreground }]}
                    >
                      {post.authorName}
                    </Text>
                    <RoleBadge role={post.authorRole} small />
                  </View>
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {timeAgo(post.createdAt)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.postText, { color: colors.foreground }]}>
                {post.text}
              </Text>
              <Text
                style={[styles.commentsLabel, { color: colors.mutedForeground }]}
              >
                {comments.length} comment{comments.length !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleDeleteComment(item.id, item.authorId)}
            activeOpacity={0.9}
            style={[styles.comment, { borderBottomColor: colors.border }]}
          >
            <View
              style={[
                styles.commentAvatar,
                { backgroundColor: colors.primary, borderRadius: 15 },
              ]}
            >
              <Text style={styles.commentAvatarLetter}>
                {item.authorName[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.commentBody}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.commentAuthor, { color: colors.foreground }]}
                >
                  {item.authorName}
                </Text>
                <RoleBadge role={item.authorRole} small />
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
              <Text style={[styles.commentText, { color: colors.foreground }]}>
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.card,
              color: colors.foreground,
              borderColor: colors.border,
              borderRadius: 20,
            },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          onPress={handleComment}
          disabled={!text.trim() || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.primary,
              opacity: !text.trim() || sending ? 0.5 : 1,
              borderRadius: 20,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  postContainer: { borderBottomWidth: 1, padding: 16 },
  postHeader: { flexDirection: "row", gap: 10, marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 16 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  authorName: { fontWeight: "700", fontSize: 15 },
  time: { fontSize: 12 },
  postText: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  commentsLabel: { fontSize: 13, fontWeight: "600" },
  comment: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderBottomWidth: 0.5,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarLetter: { color: "#fff", fontWeight: "700", fontSize: 12 },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: "600", fontSize: 13 },
  commentText: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  commentInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 0.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
