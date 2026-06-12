import { Feather } from "@expo/vector-icons";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/types";

interface Props {
  event: Event;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export function EventCard({ event, onDelete, canEdit }: Props) {
  const colors = useColors();
  const date = new Date(event.date);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={[styles.dateBlock, { backgroundColor: colors.primary }]}>
        <Text style={styles.month}>{month.toUpperCase()}</Text>
        <Text style={styles.day}>{day}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {event.title}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {time}
        </Text>
        {event.description ? (
          <Text
            style={[styles.desc, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        ) : null}
        {event.link ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(event.link)}
            style={styles.linkBtn}
          >
            <Feather name="external-link" size={13} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Join Link
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {canEdit && onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(event.id)}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  dateBlock: {
    width: 58,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  month: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  day: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  title: {
    fontWeight: "700",
    fontSize: 15,
  },
  time: {
    fontSize: 13,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 12,
    justifyContent: "center",
  },
});
