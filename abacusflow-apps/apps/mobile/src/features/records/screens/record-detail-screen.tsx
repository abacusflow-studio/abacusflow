import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedCard } from "@components/ui/animated-card";
import { Button } from "@components/ui/button";
import { CardContent } from "@components/ui/card";
import { ErrorState } from "@components/ui/error-state";
import { Text } from "@components/ui/text";
import { formatCurrency, translateOrderStatus } from "@abacusflow/utils";
import { triggerHaptic } from "@lib/haptics";
import { THEME } from "@lib/theme";
import type { OrderAction, OrderDetail } from "../types";
import {
  fetchOrderDetail,
  performOrderAction,
} from "../services/records-service";

const ACTION_META: Record<
  OrderAction,
  {
    label: string;
    confirmTitle: string;
    confirmMessage: string;
    successMessage: string;
    icon: keyof typeof Ionicons.glyphMap;
    variant: "default" | "destructive" | "outline";
  }
> = {
  complete: {
    label: "完成",
    confirmTitle: "完成订单",
    confirmMessage: "确认完成这张订单？完成后会更新库存状态。",
    successMessage: "订单已完成",
    icon: "checkmark-circle-outline",
    variant: "default",
  },
  cancel: {
    label: "取消",
    confirmTitle: "取消订单",
    confirmMessage: "确认取消这张订单？取消后不会执行库存变更。",
    successMessage: "订单已取消",
    icon: "close-circle-outline",
    variant: "destructive",
  },
  reverse: {
    label: "撤回",
    confirmTitle: "撤回订单",
    confirmMessage: "确认撤回这张已完成订单？库存变更会被冲回。",
    successMessage: "订单已撤回",
    icon: "return-up-back-outline",
    variant: "outline",
  },
};

export default function RecordDetailScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const type = params.type === "purchase" ? "purchase" : "sale";
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [acting, setActing] = useState<OrderAction | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError("订单参数无效");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchOrderDetail(type, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载订单详情失败");
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  const availableActions = getAvailableActions(detail?.status);

  const runAction = useCallback(
    async (action: OrderAction) => {
      if (!detail || acting) return;
      setActing(action);
      try {
        await performOrderAction(detail.type, detail.id, action);
        await triggerHaptic("success");
        Alert.alert("操作成功", ACTION_META[action].successMessage);
        await loadDetail();
      } catch (err) {
        await triggerHaptic("error");
        Alert.alert(
          "操作失败",
          err instanceof Error ? err.message : "订单状态更新失败",
        );
      } finally {
        setActing(null);
      }
    },
    [acting, detail, loadDetail],
  );

  const confirmAction = useCallback(
    (action: OrderAction) => {
      const meta = ACTION_META[action];
      void triggerHaptic("selection");
      Alert.alert(meta.confirmTitle, meta.confirmMessage, [
        { text: "再想想", style: "cancel" },
        {
          text: meta.label,
          style: action === "cancel" ? "destructive" : "default",
          onPress: () => {
            void runAction(action);
          },
        },
      ]);
    },
    [runAction],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={THEME.light.primary} />
          <Text className="text-sm text-muted-foreground">加载订单详情...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <ErrorState message={error ?? "订单不存在"} onRetry={loadDetail} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <AnimatedCard>
          <CardContent className="gap-5 px-4 py-5">
            <View className="flex-row items-start gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons
                  name={
                    detail.type === "purchase"
                      ? "download-outline"
                      : "arrow-up-outline"
                  }
                  size={24}
                  color={
                    detail.type === "purchase"
                      ? THEME.light.primary
                      : THEME.light.accent
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">
                  {detail.partyLabel}
                </Text>
                <Text className="mt-1 text-xl font-bold" numberOfLines={2}>
                  {detail.partyName ?? `ID ${detail.partyId}`}
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <TypeBadge type={detail.type} />
                  <Text className="text-sm font-medium text-muted-foreground">
                    {detail.orderNo}
                  </Text>
                </View>
              </View>
              <StatusBadge status={detail.status} />
            </View>

            <View className="flex-row gap-3">
              <Summary label="明细项" value={`${detail.items.length}`} />
              <Summary label="数量" value={`${detail.totalQuantity}`} />
              <Summary
                label="金额"
                value={formatCurrency(detail.totalAmount)}
              />
            </View>
          </CardContent>
        </AnimatedCard>

        {availableActions.length > 0 ? (
          <AnimatedCard index={1}>
            <CardContent className="gap-3 px-4 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Text className="text-base font-bold">订单操作</Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    当前状态：{translateOrderStatus(detail.status as any)}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                {availableActions.map((action) => {
                  const meta = ACTION_META[action];
                  const isLoading = acting === action;
                  return (
                    <Button
                      key={action}
                      className="flex-1"
                      variant={meta.variant}
                      disabled={acting !== null}
                      onPress={() => confirmAction(action)}
                    >
                      {isLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            meta.variant === "outline"
                              ? THEME.light.primary
                              : "#ffffff"
                          }
                        />
                      ) : (
                        <Ionicons
                          name={meta.icon}
                          size={16}
                          color={
                            meta.variant === "outline"
                              ? THEME.light.primary
                              : "#ffffff"
                          }
                        />
                      )}
                      <Text>{isLoading ? "处理中" : meta.label}</Text>
                    </Button>
                  );
                })}
              </View>
            </CardContent>
          </AnimatedCard>
        ) : null}

        <AnimatedCard index={availableActions.length > 0 ? 2 : 1}>
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-bold">基础信息</Text>
            <InfoRow label="订单日期" value={detail.orderDate || "-"} />
            <InfoRow label="最近更新" value={detail.updatedAt || "-"} />
            {detail.note ? <InfoRow label="备注" value={detail.note} /> : null}
          </CardContent>
        </AnimatedCard>

        <View className="gap-3">
          <Text className="text-base font-bold">明细</Text>
          {detail.items.map((item, index) => (
            <AnimatedCard
              key={item.id}
              index={index + (availableActions.length > 0 ? 3 : 2)}
            >
              <CardContent className="gap-3 px-4 py-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.code ? (
                      <Text className="mt-1 text-xs text-muted-foreground">
                        SN {item.code}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-base font-bold">
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <MiniMetric label="数量" value={`${item.quantity}`} />
                  <MiniMetric
                    label="单价"
                    value={formatCurrency(item.unitPrice)}
                  />
                  {item.discountedPrice != null ? (
                    <MiniMetric
                      label="折后"
                      value={formatCurrency(item.discountedPrice)}
                    />
                  ) : null}
                </View>
              </CardContent>
            </AnimatedCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <View className="rounded-md bg-primary/10 px-2 py-1">
      <Text className="text-xs font-semibold text-primary">
        {translateOrderStatus(status as any)}
      </Text>
    </View>
  );
}

function TypeBadge({ type }: { type: OrderDetail["type"] }) {
  const isPurchase = type === "purchase";
  return (
    <View
      className={
        isPurchase
          ? "rounded bg-primary/10 px-2 py-1"
          : "rounded bg-accent/10 px-2 py-1"
      }
    >
      <Text
        className={
          isPurchase
            ? "text-xs font-semibold text-primary"
            : "text-xs font-semibold text-accent"
        }
      >
        {isPurchase ? "采购入库" : "销售出库"}
      </Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-muted px-3 py-3">
      <Text className="text-base font-bold">{value}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium">{value}</Text>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-background px-3 py-2">
      <Text className="text-sm font-semibold">{value}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function getAvailableActions(status?: string): OrderAction[] {
  if (status === "pending") return ["complete", "cancel"];
  if (status === "completed") return ["reverse"];
  return [];
}
