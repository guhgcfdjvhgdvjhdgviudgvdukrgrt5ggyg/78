import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Admin Panel",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="users"
        options={{ title: "Manage Users" }}
      />
      <Stack.Screen
        name="posts"
        options={{ title: "Manage Posts" }}
      />
      <Stack.Screen
        name="chat"
        options={{ title: "Chat Messages" }}
      />
      <Stack.Screen
        name="events"
        options={{ title: "Manage Events" }}
      />
      <Stack.Screen
        name="announcements"
        options={{ title: "Announcements" }}
      />
      <Stack.Screen
        name="broadcast"
        options={{ title: "Broadcast" }}
      />
    </Stack>
  );
}
