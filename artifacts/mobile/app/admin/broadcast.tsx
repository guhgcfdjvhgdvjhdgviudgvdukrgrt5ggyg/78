import { Feather } from "@expo/vector-icons";
import { adminApi } from "@/lib/api";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function AdminBroadcastScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Title and message are required.");
      return;
    }
    setSending(true);
    try {
      await adminApi.notifications.broadcast(title.trim(), body.trim());
      Alert.alert("Sent!", "Broadcast sent to all members.");
      setTitle("");
      setBody("");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconArea}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="radio" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.iconLabel, { color: colors.mutedForeground }]}>
          Send a notification to all community members
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>TITLE</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: 20,
            backgroundColor: colors.card,
          },
        ]}
        placeholder="Broadcast title..."
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>MESSAGE</Text>
      <TextInput
        style={[
          styles.textarea,
          {
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius,
            backgroundColor: colors.card,
          },
        ]}
        placeholder="Write your message to all members..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        value={body}
        onChangeText={setBody}
      />

      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: colors.secondary,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Text style={[styles.infoText, { color: colors.primary }]}>
          This will notify all community members and post an announcement.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.sendBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: 20,
            opacity: !title.trim() || !body.trim() || sending ? 0.5 : 1,
          },
        ]}
        onPress={handleSend}
        disabled={!title.trim() || !body.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendBtnText}>Send Broadcast</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconArea: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  iconLabel: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 0.5,
  },
  textarea: {
    height: 140,
    padding: 14,
    fontSize: 15,
    borderWidth: 0.5,
    textAlignVertical: "top",
  },
  infoBox: {
    padding: 14,
    marginTop: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sendBtn: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
