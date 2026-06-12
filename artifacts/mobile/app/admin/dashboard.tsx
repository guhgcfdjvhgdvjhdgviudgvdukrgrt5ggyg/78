import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setAdminToken } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const ADMIN_TOKEN_KEY = "admin_token";

interface Card {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route?: any;
  action?: () => void;
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
          setAdminToken(null);
          router.replace("/admin/login");
        },
      },
    ]);
  };

  const cards: Card[] = [
    { title: "Users", icon: "users", color: colors.primary, route: "/admin/users" },
    { title: "Posts", icon: "file-text", color: colors.adminBadge, route: "/admin/posts" },
    { title: "Events", icon: "calendar", color: colors.primary, route: "/admin/events" },
    { title: "Announcements", icon: "bell", color: colors.modBadge, route: "/admin/announcements" },
    { title: "Chat Messages", icon: "message-circle", color: colors.primary, route: "/admin/chat" },
    { title: "Broadcast", icon: "radio", color: colors.modBadge, route: "/admin/broadcast" },
    { title: "Logout", icon: "log-out", color: colors.destructive, action: handleLogout },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((card) => (
          <TouchableOpacity
            key={card.title}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
            onPress={() => {
              if (card.action) card.action();
              else if (card.route) router.push(card.route);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: card.color + "20", borderRadius: colors.radius }]}>
              <Feather name={card.icon} size={24} color={card.color} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {card.title}
            </Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 0.5,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
});
