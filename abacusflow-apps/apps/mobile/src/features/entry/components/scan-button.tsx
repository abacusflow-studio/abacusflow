import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@components/ui/button";
import { PressableScale } from "@components/ui/pressable-scale";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  label: string;
  onPress: () => void;
  onManualSelect?: () => void;
}

/** 扫码添加产品按钮（带可选手动选择） */
export function ScanButton({ label, onPress, onManualSelect }: Props) {
  return (
    <View className="mb-4 gap-3">
      <PressableScale haptic="medium" onPress={onPress}>
        <View className="flex-row items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 shadow-sm shadow-black/10">
          <Ionicons
            name="scan"
            size={24}
            color={THEME.light.primaryForeground}
          />
          <Text className="text-base font-bold text-primary-foreground">
            {label}
          </Text>
        </View>
      </PressableScale>
      {onManualSelect && (
        <Button
          variant="ghost"
          className="h-10 gap-2 self-center px-4"
          onPress={onManualSelect}
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={THEME.light.mutedForeground}
          />
          <Text className="text-sm text-muted-foreground">手动选择</Text>
        </Button>
      )}
    </View>
  );
}
