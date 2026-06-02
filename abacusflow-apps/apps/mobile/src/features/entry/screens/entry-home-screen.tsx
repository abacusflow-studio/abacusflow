import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedCard } from "@components/ui/animated-card";
import { CardContent } from "@components/ui/card";
import { PressableScale } from "@components/ui/pressable-scale";
import { Text } from "@components/ui/text";
import { listAllDrafts } from "@lib/draft-store";
import { THEME } from "@lib/theme";

export default function EntryHomeScreen() {
  const router = useRouter();
  const [draftCount, setDraftCount] = useState(0);

  const checkDrafts = useCallback(async () => {
    try {
      const drafts = await listAllDrafts();
      setDraftCount(drafts.length);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkDrafts();
    }, [checkDrafts]),
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 p-4 pb-8">
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280 }}
          className="overflow-hidden rounded-[22px] border border-border bg-card"
        >
          <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10" />
          <View className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-accent/10" />
          <View className="p-5">
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
                小算盘移动作业台
              </Text>
              <Text className="text-3xl font-bold leading-tight">
                扫码、录入、提交
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                面向仓库现场的快速作业入口，减少表单来回切换。
              </Text>
            </View>
          </View>
        </MotiView>

        {draftCount > 0 && (
          <PressableScale
            haptic="medium"
            onPress={() => router.push("/(tabs)/drafts" as any)}
          >
            <View className="flex-row items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
              <Ionicons
                name="alert-circle"
                size={20}
                color={THEME.light.primary}
              />
              <Text className="flex-1 text-sm font-semibold text-primary">
                有 {draftCount} 条未提交草稿，继续处理
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={THEME.light.primary}
              />
            </View>
          </PressableScale>
        )}

        <View className="gap-3">
          <SectionTitle title="现场作业" subtitle="优先处理高频库存动作" />
          <EntryAction
            index={0}
            title="采购入库"
            description="扫码添加产品，选择供应商，完成入库"
            meta="适合到货验收"
            icon="download-outline"
            tint="primary"
            onPress={() => router.push("/entry/purchase" as any)}
          />
          <EntryAction
            index={1}
            title="销售出库"
            description="扫码选择库存单元，核对客户后提交"
            meta="适合拣货发货"
            icon="arrow-up-outline"
            tint="accent"
            onPress={() => router.push("/entry/sale" as any)}
          />
        </View>

        <View className="gap-3">
          <SectionTitle title="辅助动作" subtitle="补充资料与快速查询" />
          <View className="flex-row gap-3">
            <SecondaryAction
              index={2}
              title="新品建档"
              description="先建档再入库"
              icon="add-circle-outline"
              iconColor={THEME.light.primary}
              onPress={() => router.push("/entry/product" as any)}
            />
            <SecondaryAction
              index={3}
              title="查业务资料"
              description="业务资料一键查"
              icon="search-outline"
              iconColor={THEME.light.accent}
              onPress={() => router.push("/(tabs)/lookup" as any)}
            />
          </View>
        </View>
        {/*
        <View className="gap-3">
          <SectionTitle title="资料维护" subtitle="现场需要时快速补全基础资料" />
          <View className="flex-row gap-3">
            <SecondaryAction
              index={4}
              title="客户资料"
              description="维护客户信息"
              icon="person-outline"
              iconColor="#6366f1"
              onPress={() => router.push("/partner/customer" as any)}
            />
            <SecondaryAction
              index={5}
              title="供应商资料"
              description="维护供应商"
              icon="storefront-outline"
              iconColor="#8b5cf6"
              onPress={() => router.push("/partner/supplier" as any)}
            />
          </View>
          <View className="flex-row gap-3">
            <SecondaryAction
              index={6}
              title="存储点资料"
              description="维护仓储位置"
              icon="location-outline"
              iconColor="#ec4899"
              onPress={() => router.push("/(tabs)/depots" as any)}
            />
            <View className="flex-1" />
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View>
      <Text className="text-base font-bold">{title}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{subtitle}</Text>
    </View>
  );
}

interface EntryActionProps {
  index: number;
  title: string;
  description: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: "primary" | "accent";
  onPress: () => void;
}

function EntryAction({
  index,
  title,
  description,
  meta,
  icon,
  tint,
  onPress,
}: EntryActionProps) {
  const iconColor =
    tint === "primary" ? THEME.light.primary : THEME.light.accent;
  const iconClassName = tint === "primary" ? "bg-primary/10" : "bg-accent/10";

  return (
    <AnimatedCard index={index}>
      <PressableScale haptic="medium" onPress={onPress}>
        <CardContent className="flex-row items-center gap-4 px-4 py-4">
          <View
            className={`h-[56px] w-[56px] items-center justify-center rounded-2xl ${iconClassName}`}
          >
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold">{title}</Text>
              <View className="rounded-md bg-muted px-2 py-1">
                <Text className="text-xs text-muted-foreground">{meta}</Text>
              </View>
            </View>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {description}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={THEME.light.mutedForeground}
          />
        </CardContent>
      </PressableScale>
    </AnimatedCard>
  );
}

interface SecondaryActionProps {
  index: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
}

function SecondaryAction({
  index,
  title,
  description,
  icon,
  iconColor,
  onPress,
}: SecondaryActionProps) {
  return (
    <AnimatedCard className="flex-1" index={index}>
      <PressableScale haptic="selection" onPress={onPress}>
        <CardContent className="gap-3 px-4 py-4">
          <Ionicons name={icon} size={24} color={iconColor} />
          <View>
            <Text className="text-sm font-bold">{title}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {description}
            </Text>
          </View>
        </CardContent>
      </PressableScale>
    </AnimatedCard>
  );
}
