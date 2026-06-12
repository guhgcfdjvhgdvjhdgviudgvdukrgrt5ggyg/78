import { addDoc, collection, getDocs } from "firebase/firestore";
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
import { db } from "@/lib/firebase";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AdminBroadcastModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !profile) return;
    setSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const notifPromises = usersSnap.docs.map((userDoc) =>
        addDoc(collection(db, "notifications", userDoc.id, "items"), {
          type: "broadcast",
          message: `📢 ${title}: ${message}`,
          read: false,
          createdAt: Date.now(),
        })
      );
      await Promise.all(notifPromises);
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        body: message.trim(),
        createdAt: Date.now(),
        pinned: true,
      });
      Alert.alert("Sent!", `Broadcast sent to ${usersSnap.docs.length} members.`);
      setTitle("");
      setMessage("");
      onClose();
    } catch {
      Alert.alert("Error", "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancel, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Broadcast
          </Text>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!title.trim() || !message.trim() || sending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: colors.primary,
                opacity: !title.trim() || !message.trim() || sending ? 0.5 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            TITLE
          </Text>
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

          <Text
            style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}
          >
            MESSAGE
          </Text>
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
            value={message}
            onChangeText={setMessage}
          />

          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.secondary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.infoText, { color: colors.primary }]}>
              This will notify all community members and post an announcement.
            </Text>
          </View>
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
  cancel: { fontSize: 15 },
  title: { fontWeight: "700", fontSize: 16 },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  body: {
    padding: 16,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 0.5,
  },
  textarea: {
    height: 120,
    padding: 14,
    fontSize: 15,
    borderWidth: 0.5,
    textAlignVertical: "top",
  },
  infoBox: {
    marginTop: 20,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
