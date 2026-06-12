import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { UserRole } from "@/types";

interface Props {
  role: UserRole;
  small?: boolean;
}

export function RoleBadge({ role, small }: Props) {
  const colors = useColors();
  if (role === "member") return null;
  const isAdmin = role === "admin";
  const bg = isAdmin ? colors.adminBadge : colors.modBadge;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingHorizontal: small ? 6 : 8 },
      ]}
    >
      <Text style={[styles.text, { fontSize: small ? 9 : 10 }]}>
        {isAdmin ? "Admin" : "Mod"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
