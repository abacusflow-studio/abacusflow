import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { Text } from "@components/ui/text";
import { listAllDrafts } from "@lib/draft-store";
import { THEME } from "@lib/theme";

export default function EntryHomeScreen() {
  const router = useRouter();
  const [draftCount, setDraftCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      checkDrafts();
    }, []),
  );

  const checkDrafts = async () => {
    try {
      const drafts = await listAllDrafts();
      setDraftCount(drafts.length);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 p-4 pb-8">
        {draftCount > 0 && (
          <Button
            variant="secondary"
            className="h-auto justify-start gap-3 rounded-lg px-4 py-3"
            onPress={() => router.push("/(tabs)/drafts" as any)}
          >
            <Ionicons
              name="alert-circle"
              size={18}
              color={THEME.light.secondaryForeground}
            />
            <Text className="flex-1 text-sm font-semibold text-secondary-foreground">
              有 {draftCount} 条未提交草稿，继续处理
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={THEME.light.secondaryForeground}
            />
          </Button>
        )}

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-muted-foreground">
            扫码录入
          </Text>

          <EntryAction
            title="扫码入库"
            description="扫描条码，创建采购入库单"
            icon="download-outline"
            iconClassName="bg-primary/10"
            iconColor={THEME.light.primary}
            onPress={() => router.push("/entry/purchase" as any)}
          />

          <EntryAction
            title="扫码出库"
            description="扫描条码，创建销售出库单"
            icon="arrow-up-outline"
            iconClassName="bg-accent/10"
            iconColor={THEME.light.accent}
            onPress={() => router.push("/entry/sale" as any)}
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-muted-foreground">
            其他操作
          </Text>
          <View className="flex-row gap-3">
            <SecondaryAction
              title="新品建档"
              icon="add-circle-outline"
              iconColor={THEME.light.primary}
              onPress={() => router.push("/entry/product" as any)}
            />
            <SecondaryAction
              title="扫码查库存"
              icon="search-outline"
              iconColor={THEME.light.mutedForeground}
              onPress={() => router.push("/(tabs)/lookup" as any)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface EntryActionProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconClassName: string;
  iconColor: string;
  onPress: () => void;
}

function EntryAction({
  title,
  description,
  icon,
  iconClassName,
  iconColor,
  onPress,
}: EntryActionProps) {
  return (
    <Button
      variant="outline"
      className="h-auto justify-between rounded-xl bg-card p-4"
      onPress={onPress}
    >
      <View className="flex-1 flex-row items-center gap-4">
        <View
          className={`h-[52px] w-[52px] items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold">{title}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {description}
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={22}
        color={THEME.light.mutedForeground}
      />
    </Button>
  );
}

interface SecondaryActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
}

function SecondaryAction({
  title,
  icon,
  iconColor,
  onPress,
}: SecondaryActionProps) {
  return (
    <Card className="flex-1 py-0">
      <Button
        variant="ghost"
        className="h-auto flex-col gap-2 rounded-xl px-3 py-5"
        onPress={onPress}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
        <Text className="text-sm font-semibold">{title}</Text>
      </Button>
    </Card>
  );
}
