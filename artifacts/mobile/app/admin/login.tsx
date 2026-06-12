import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, setAdminToken } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const ADMIN_TOKEN_KEY = "admin_token";

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await api.auth.login(email.trim(), password);
      if (user.role !== "admin") {
        Alert.alert("Admin Access Only", "This portal is for administrators only.");
        return;
      }
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminToken(token);
      router.replace("/admin/dashboard");
    } catch (err: any) {
      const msg = err.message ?? "Login failed.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: colors.adminBadge, borderRadius: 28 },
            ]}
          >
            <Feather name="shield" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Admin Panel
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Authorized personnel only
          </Text>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.inputWrap,
              {
                borderColor: colors.border,
                borderRadius: 20,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Feather name="mail" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View
            style={[
              styles.inputWrap,
              {
                borderColor: colors.border,
                borderRadius: 20,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass((p) => !p)}>
              <Feather
                name={showPass ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.adminBadge,
                borderRadius: 20,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Admin Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  primaryBtn: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
