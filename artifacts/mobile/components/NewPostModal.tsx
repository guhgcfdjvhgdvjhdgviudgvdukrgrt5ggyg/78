import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NewPostModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || !profile) return;
    setSubmitting(true);
    try {
      const imageUrl = imageUri ?? null;
      await api.posts.create(text.trim(), imageUrl);
      setText("");
      setImageUri(null);
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setText("");
    setImageUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "ios" ? 0 : insets.top + 10,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            New Post
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
            style={[
              styles.postBtn,
              { backgroundColor: colors.primary, opacity: !text.trim() || submitting ? 0.5 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary, borderRadius: 20 },
            ]}
          >
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>
                {profile?.name[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Share something with the community..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />
        </View>

        {imageUri && (
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.previewImg, { borderRadius: colors.radius }]}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              style={[styles.removeImg, { backgroundColor: colors.destructive }]}
            >
              <Feather name="x" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.toolbar, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity onPress={pickImage} style={styles.toolbarBtn}>
            <Feather name="image" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerBtn: { padding: 4 },
  cancelText: { fontSize: 15 },
  title: { fontWeight: "700", fontSize: 16 },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  body: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 40, height: 40 },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 16 },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  imagePreview: {
    marginHorizontal: 16,
    marginBottom: 8,
    position: "relative",
    alignSelf: "flex-start",
  },
  previewImg: {
    width: 160,
    height: 120,
  },
  removeImg: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  toolbarBtn: { padding: 4 },
});
