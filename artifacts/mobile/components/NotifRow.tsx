import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/timeAgo";
import type { AppNotification } from "@/types";

interface Props {
  notification: AppNotification;
  onPress?: (n: AppNotification) => void;
}

const iconMap = {
  post: "file-text",
  comment: "message-square",
  dm: "mail",
  event: "calendar",
  broadcast: "radio",
} as const;

export function NotifRow({ notification, onPress }: Props) {
  const colors = useColors();
  const icon = iconMap[notification.type] ?? "bell";

  return (
    <TouchableOpacity
      onPress={() => onPress?.(notification)}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          backgroundColor: notification.read ? colors.background : colors.accent,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: notification.read ? colors.muted : colors.primary,
            borderRadius: 20,
          },
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={notification.read ? colors.mutedForeground : "#fff"}
        />
      </View>
      <View style={styles.body}>
        <Text
          style={[
            styles.message,
            {
              color: colors.foreground,
              fontWeight: notification.read ? "400" : "600",
            },
          ]}
        >
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(notification.createdAt)}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  body: { flex: 1 },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
