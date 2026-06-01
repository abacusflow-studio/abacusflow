import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import { CURRENT_VERSION } from "@abacusflow/config";

import { useAuthSnapshot } from "../hooks/use-auth-snapshot";
import { UserProfileCard } from "../components/user-profile-card";
import { MenuSection } from "../components/menu-section";
import type { MenuSection as MenuSectionType } from "../types";

const MENU_SECTIONS: MenuSectionType[] = [
  {
    title: "资料",
    items: [
      {
        label: "客户资料",
        icon: "person-outline",
        route: "/partner/customer",
      },
      {
        label: "供应商资料",
        icon: "storefront-outline",
        route: "/partner/supplier",
      },
      {
        label: "储存点",
        icon: "location-outline",
        route: "/(tabs)/depots",
      },
    ],
  },
  {
    title: "帮助",
    items: [
      {
        label: "问题反馈",
        icon: "chatbubble-ellipses-outline",
        route: "/feedback",
      },
    ],
  },
];

export default function MeScreen() {
  const router = useRouter();
  const { authSnapshot, displayName, displayEmail, avatarLetter, handleLogout } =
    useAuthSnapshot();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <UserProfileCard
          displayName={displayName}
          displayEmail={displayEmail}
          avatarLetter={avatarLetter}
          isAuthenticated={authSnapshot.authenticated}
        />

        {MENU_SECTIONS.map((section) => (
          <MenuSection
            key={section.title}
            section={section}
            onItemPress={(route) => router.push(route as any)}
          />
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v{CURRENT_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
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
