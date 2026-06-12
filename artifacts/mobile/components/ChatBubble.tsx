import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/timeAgo";
import type { ChatMessage } from "@/types";
import { RoleBadge } from "./RoleBadge";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
}

export function ChatBubble({ message, isOwn, showSender = true }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {!isOwn && (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: 16 }]}
        >
          {message.senderAvatar ? (
            <Image source={{ uri: message.senderAvatar }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>
              {message.senderName[0]?.toUpperCase()}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.bubbleGroup, isOwn && styles.bubbleGroupOwn]}>
        {!isOwn && showSender && (
          <View style={styles.senderRow}>
            <Text style={[styles.senderName, { color: colors.foreground }]}>
              {message.senderName}
            </Text>
            <RoleBadge role={message.senderRole} small />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isOwn ? colors.primary : colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: isOwn ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {message.text}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    marginHorizontal: 12,
    gap: 8,
    alignItems: "flex-end",
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 32,
    height: 32,
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  bubbleGroup: {
    maxWidth: "72%",
  },
  bubbleGroupOwn: {
    alignItems: "flex-end",
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
    paddingLeft: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    fontSize: 11,
    marginTop: 3,
    paddingHorizontal: 2,
  },
});
