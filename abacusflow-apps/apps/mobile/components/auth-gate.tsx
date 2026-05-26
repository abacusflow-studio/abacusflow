import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@abacusflow/ui-tokens";

import {
  getMobileAuthSnapshot,
  initializeMobileAuthSession,
  loginMobileAuth,
  logoutMobileAuth,
  subscribeMobileAuth,
  type MobileAuthSnapshot,
} from "@/lib/auth-provider";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [auth, setAuth] = useState<MobileAuthSnapshot>(getMobileAuthSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeMobileAuth(setAuth);
    initializeMobileAuthSession();
    return unsubscribe;
  }, []);

  if (!auth.ready) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.mutedText}>正在准备登录状态</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (auth.configIssues.length > 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.panel}>
          <Text style={styles.title}>移动端配置不完整</Text>
          <Text style={styles.description}>
            请在 Expo 环境中配置下面这些变量，然后重新启动应用。
          </Text>
          {auth.configIssues.map((issue) => (
            <Text key={issue} style={styles.codeLine}>
              {issue}
            </Text>
          ))}
          <Text style={styles.hint}>
            Auth0 回调地址: abacusflow://oauth/callback
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!auth.authenticated) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.panel}>
          <Text style={styles.appName}>小算盘</Text>
          <Text style={styles.title}>登录后继续</Text>
          <Text style={styles.description}>
            使用 Auth0 账号登录后，应用会同步后端用户资料并连接真实服务。
          </Text>
          {auth.error && <Text style={styles.errorText}>{auth.error}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={auth.signingIn}
            onPress={loginMobileAuth}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || auth.signingIn) && styles.pressedButton,
            ]}
          >
            {auth.signingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>登录</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.appShell}>
      {auth.error && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{auth.error}</Text>
          <Pressable accessibilityRole="button" onPress={logoutMobileAuth}>
            <Text style={styles.bannerAction}>退出</Text>
          </Pressable>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
  },
  appShell: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: "center", gap: 12 },
  panel: {
    margin: 24,
    padding: 24,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  mutedText: { fontSize: 14, color: COLORS.textTertiary },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  codeLine: {
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
  },
  pressedButton: { opacity: 0.7 },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  banner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  bannerAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
