import { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/ui-tokens";
import { CURRENT_VERSION } from "@abacusflow/config";
import { getAuthClient } from "@abacusflow/core";
import {
  getMobileAuthSnapshot,
  subscribeMobileAuth,
  type MobileAuthSnapshot,
} from "@/lib/auth-provider";

const MENU_SECTIONS = [
  {
    title: "资料",
    items: [
      {
        label: "客户资料",
        icon: "person-outline" as const,
        route: "/partner/customer" as any,
      },
      {
        label: "供应商资料",
        icon: "storefront-outline" as const,
        route: "/partner/supplier" as any,
      },
      {
        label: "储存点",
        icon: "location-outline" as const,
        route: "/(tabs)/depots" as any,
      },
    ],
  },
  {
    title: "帮助",
    items: [
      {
        label: "问题反馈",
        icon: "chatbubble-ellipses-outline" as const,
        route: "/feedback" as any,
      },
    ],
  },
];

export default function MeScreen() {
  const router = useRouter();
  const [authSnapshot, setAuthSnapshot] = useState<MobileAuthSnapshot>(
    getMobileAuthSnapshot(),
  );

  useEffect(() => {
    return subscribeMobileAuth(setAuthSnapshot);
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuthClient();
      await auth.logout();
    } catch (err) {
      console.error(err);
    }
  };

  const displayName =
    authSnapshot.user?.nickname || authSnapshot.user?.name || "未登录";
  const displayEmail = authSnapshot.user?.email ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Section */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            {displayEmail ? (
              <Text style={styles.userHint}>{displayEmail}</Text>
            ) : (
              <Text style={styles.userHint}>
                {authSnapshot.authenticated ? "已连接" : "未登录"}
              </Text>
            )}
          </View>
        </View>

        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => router.push(item.route)}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textDisabled}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>v{CURRENT_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  userHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    backgroundColor: COLORS.bgCard,
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, color: COLORS.danger, fontWeight: "600" },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textDisabled,
  },
});
