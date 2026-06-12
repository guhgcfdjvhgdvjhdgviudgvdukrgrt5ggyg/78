import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { UserProfile } from "@/types";
import { RoleBadge } from "./RoleBadge";

interface Props {
  member: UserProfile;
  onPress: (member: UserProfile) => void;
}

export function MemberRow({ member, onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={() => onPress(member)}
      activeOpacity={0.7}
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.primary, borderRadius: 24 },
        ]}
      >
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarLetter}>
            {member.name[0]?.toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {member.name}
        </Text>
        {member.bio ? (
          <Text
            style={[styles.bio, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {member.bio}
          </Text>
        ) : null}
      </View>
      <RoleBadge role={member.role} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 46,
    height: 46,
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: "600",
    fontSize: 15,
  },
  bio: {
    fontSize: 13,
    marginTop: 2,
  },
});
