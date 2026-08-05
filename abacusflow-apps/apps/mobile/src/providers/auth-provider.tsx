import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@abacusflow/utils";

import {
  getMobileAuthSnapshot,
  initializeMobileAuthSession,
  loginMobileAuth,
  logoutMobileAuth,
  selectMobileTenant,
  subscribeMobileAuth,
  type MobileAuthSnapshot,
} from "@features/auth/services/auth-service";

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
      <SafeAreaView style={styles.loginScreen}>
        <View pointerEvents="none" style={styles.backgroundSheet} />
        <View pointerEvents="none" style={styles.backgroundRail} />
        <View pointerEvents="none" style={styles.backgroundAccent} />

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.loginContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandCluster}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>小</Text>
            </View>
            <Text style={styles.appName}>小算盘</Text>
            <Text style={styles.tagline}>库存流转，心里有数</Text>
          </View>

          <View style={styles.authPanel}>
            <View style={styles.panelTopLine} />
            <Text style={styles.eyebrow}>ABACUSFLOW MOBILE</Text>
            <Text style={styles.title}>登录后继续</Text>
            <Text style={styles.description}>
              使用 Auth0 账号登录后，应用会同步后端用户资料并连接真实服务。
            </Text>
            <View style={styles.featureRow}>
              <View style={styles.featurePill}>
                <Ionicons
                  name="person-circle-outline"
                  size={17}
                  color="#0f766e"
                />
                <Text style={styles.featureText}>同步资料</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="server-outline" size={16} color="#0f766e" />
                <Text style={styles.featureText}>连接服务</Text>
              </View>
            </View>
            {auth.error && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={COLORS.danger}
                />
                <Text style={styles.errorText}>{auth.error}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.loginFooter}>
          <Pressable
            accessibilityRole="button"
            disabled={auth.signingIn}
            onPress={loginMobileAuth}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || auth.signingIn) && styles.pressedButton,
              auth.signingIn && styles.disabledButton,
            ]}
          >
            {auth.signingIn ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="log-in-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.primaryButtonText}>登录</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.secureText}>Auth0 安全登录</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Tenant selection: show picker if multi-tenant with no tenant selected
  if (
    auth.authenticated &&
    auth.tenantStatus === "MULTI_TENANT" &&
    auth.currentTenantId === null &&
    auth.tenants.length > 0
  ) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.tenantPanel}>
          <Ionicons name="business-outline" size={48} color={COLORS.primary} />
          <Text style={styles.tenantTitle}>选择租户</Text>
          <Text style={styles.tenantDesc}>
            您属于多个租户，请选择要进入的租户
          </Text>
          <ScrollView
            style={styles.tenantList}
            contentContainerStyle={{ gap: 10 }}
          >
            {auth.tenants.map((t) => (
              <Pressable
                key={t.tenantId}
                style={({ pressed }) => [
                  styles.tenantItem,
                  pressed && styles.tenantItemPressed,
                ]}
                onPress={() => selectMobileTenant(t.tenantId)}
              >
                <View style={styles.tenantAvatar}>
                  <Text style={styles.tenantAvatarText}>
                    {(t.displayName || t.name).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tenantItemName}>
                    {t.displayName || t.name}
                  </Text>
                  {t.roleNames.length > 0 && (
                    <Text style={styles.tenantItemRoles}>
                      {t.roleNames.join(", ")}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textTertiary}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Tenant onboarding: show message for NEEDS_ONBOARDING
  if (auth.authenticated && auth.tenantStatus === "NEEDS_ONBOARDING") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={COLORS.primary} />
          <Text style={styles.tenantTitle}>需要创建租户</Text>
          <Text style={styles.tenantDesc}>
            请在网页端创建您的第一个租户后，再使用移动端应用。
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={logoutMobileAuth}
            style={[styles.primaryButton, { marginTop: 24, minWidth: 200 }]}
          >
            <Text style={styles.primaryButtonText}>退出登录</Text>
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
  loginScreen: {
    flex: 1,
    backgroundColor: "#f6f8f5",
  },
  backgroundSheet: {
    position: "absolute",
    top: -70,
    left: -28,
    right: -28,
    height: 270,
    backgroundColor: "#ebf8f2",
    transform: [{ rotate: "-5deg" }],
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  backgroundRail: {
    position: "absolute",
    top: 96,
    right: -48,
    width: 156,
    height: 420,
    borderLeftWidth: 1,
    borderColor: "#c7ead8",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    transform: [{ rotate: "10deg" }],
  },
  backgroundAccent: {
    position: "absolute",
    top: 190,
    left: 28,
    width: 86,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 132,
  },
  brandCluster: {
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "800",
  },
  panel: {
    margin: 24,
    padding: 24,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authPanel: {
    overflow: "hidden",
    padding: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "#d9e4dc",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 4,
  },
  panelTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.primary,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 14,
  },
  appName: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  mutedText: { fontSize: 14, color: COLORS.textTertiary },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featurePill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  featureText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 18,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 14,
    lineHeight: 20,
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
  loginFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: "rgba(246, 248, 245, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(203, 213, 225, 0.55)",
  },
  primaryButton: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#16a34a",
    borderWidth: 1,
    borderColor: "#15803d",
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  pressedButton: { opacity: 0.7 },
  disabledButton: { backgroundColor: "#15803d" },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  secureText: {
    marginTop: 10,
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "600",
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
  tenantPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  tenantTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 34,
  },
  tenantDesc: {
    fontSize: 16,
    lineHeight: 25,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  tenantList: {
    width: "100%",
    maxHeight: 320,
  },
  tenantItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tenantItemPressed: {
    opacity: 0.7,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(22, 163, 74, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tenantAvatarText: {
    color: "#16a34a",
    fontWeight: "700",
    fontSize: 18,
  },
  tenantItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  tenantItemRoles: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
