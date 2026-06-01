import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedCard } from "@components/ui/animated-card";
import { Button } from "@components/ui/button";
import { CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  showMore: boolean;
  onToggle: () => void;
  orderDate: string;
  onOrderDateChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  /** 额外的字段（如折扣系数） */
  extraFields?: React.ReactNode;
}

/** 可折叠的"更多信息"区域 */
export function MoreOptionsSection({
  showMore,
  onToggle,
  orderDate,
  onOrderDateChange,
  note,
  onNoteChange,
  extraFields,
}: Props) {
  return (
    <View className="gap-3">
      <Button
        variant="ghost"
        className="h-10 justify-start gap-2 px-1"
        onPress={onToggle}
      >
        <Text className="text-sm text-muted-foreground">
          {showMore ? "收起更多信息" : "更多信息"}
        </Text>
        <Ionicons
          name={showMore ? "chevron-up" : "chevron-down"}
          size={16}
          color={THEME.light.mutedForeground}
        />
      </Button>

      {showMore && (
        <AnimatedCard>
          <CardContent className="gap-4 px-4 py-4">
            {extraFields}
            <View className="gap-2">
              <Text className="text-xs font-medium text-muted-foreground">
                订单日期
              </Text>
              <Input
                className="h-11 bg-background"
                value={orderDate}
                onChangeText={onOrderDateChange}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-medium text-muted-foreground">
                备注
              </Text>
              <Input
                className="h-11 bg-background"
                value={note}
                onChangeText={onNoteChange}
                placeholder="可选备注"
              />
            </View>
          </CardContent>
        </AnimatedCard>
      )}
    </View>
  );
}
