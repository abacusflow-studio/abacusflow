import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { Text } from "@components/ui/text";
import { getCurrentVersion } from "@abacusflow/config";
import { THEME } from "@lib/theme";
import { MenuSection } from "../components/menu-section";
import { UserProfileCard } from "../components/user-profile-card";
import { useAuthSnapshot } from "../hooks/use-auth-snapshot";
import type { MenuSection as MenuSectionType } from "../types";

const MENU_SECTIONS: MenuSectionType[] = [
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
  const {
    authSnapshot,
    displayName,
    displayEmail,
    avatarLetter,
    handleLogout,
  } = useAuthSnapshot();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10">
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

        <Button
          variant="outline"
          className="h-12 border-destructive/20 bg-card"
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={THEME.light.destructive}
          />
          <Text className="font-semibold text-destructive">退出登录</Text>
        </Button>

        <Text className="text-center text-xs text-muted-foreground">
          v{getCurrentVersion()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
