import { ActivityIndicator, View } from "react-native";

import { PressableScale } from "@components/ui/pressable-scale";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  itemCount: number;
  totalAmount: number;
  submitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
}

/** 底部粘性栏（数量/总计/提交） */
export function OrderBottomBar({
  itemCount,
  totalAmount,
  submitting,
  submitLabel,
  onSubmit,
}: Props) {
  return (
    <View className="flex-row items-center gap-4 border-t border-border bg-card px-4 py-3">
      <View className="flex-1">
        <Text className="text-xs text-muted-foreground">
          {itemCount} 项明细
        </Text>
        <Text className="mt-1 text-2xl font-bold">
          ¥{totalAmount.toLocaleString("zh-CN")}
        </Text>
      </View>
      <PressableScale
        className="min-w-32"
        haptic="success"
        disabled={submitting}
        onPress={onSubmit}
      >
        <View className="min-h-[52px] items-center justify-center rounded-2xl bg-primary px-6 shadow-sm shadow-black/10">
          {submitting ? (
            <ActivityIndicator
              color={THEME.light.primaryForeground}
              size="small"
            />
          ) : (
            <Text className="text-base font-bold text-primary-foreground">
              {submitLabel}
            </Text>
          )}
        </View>
      </PressableScale>
    </View>
  );
}
