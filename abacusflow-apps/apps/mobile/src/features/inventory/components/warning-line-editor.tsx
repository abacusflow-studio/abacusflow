import { View, TextInput } from "react-native";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { THEME } from "@lib/theme";

interface Props {
  editing: boolean;
  safetyStock: string;
  maxStock: string;
  displaySafetyStock: number | undefined;
  displayMaxStock: number | undefined;
  onSafetyStockChange: (value: string) => void;
  onMaxStockChange: (value: string) => void;
  onToggle: () => void;
  onSave: () => void;
}

export function WarningLineEditor({
  editing,
  safetyStock,
  maxStock,
  displaySafetyStock,
  displayMaxStock,
  onSafetyStockChange,
  onMaxStockChange,
  onToggle,
  onSave,
}: Props) {
  return (
    <>
      <View className="flex-row justify-between items-center mb-2 mt-2">
        <Text className="text-base font-semibold">预警线设置</Text>
        <Button variant="ghost" onPress={onToggle}>
          <Text style={{ color: THEME.light.primary }}>
            {editing ? "取消" : "编辑"}
          </Text>
        </Button>
      </View>
      <Card className="mb-4">
        <CardContent className="p-4">
          {editing ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Text className="text-sm w-20">安全库存</Text>
                <TextInput
                  className="flex-1 border border-border rounded-md px-3 py-2 text-sm"
                  value={safetyStock}
                  onChangeText={onSafetyStockChange}
                  keyboardType="numeric"
                  placeholder="最低库存量"
                  placeholderTextColor={THEME.light.mutedForeground}
                />
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm w-20">最大库存</Text>
                <TextInput
                  className="flex-1 border border-border rounded-md px-3 py-2 text-sm"
                  value={maxStock}
                  onChangeText={onMaxStockChange}
                  keyboardType="numeric"
                  placeholder="最大库存量"
                  placeholderTextColor={THEME.light.mutedForeground}
                />
              </View>
              <Button onPress={onSave} className="mt-1">
                <Text className="text-sm font-semibold text-primary-foreground">保存</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between py-3 border-b border-border">
                <Text variant="muted" className="text-sm">安全库存</Text>
                <Text className="text-sm font-medium">{displaySafetyStock ?? "-"}</Text>
              </View>
              <View className="flex-row justify-between py-3">
                <Text variant="muted" className="text-sm">最大库存</Text>
                <Text className="text-sm font-medium">{displayMaxStock ?? "-"}</Text>
              </View>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
