import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@components/ui/button";
import { THEME } from "@lib/theme";
import type { LookupMode } from "../types";

interface Props {
  mode: Exclude<LookupMode, "menu">;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onScan: () => void;
  onBack: () => void;
}

export function LookupSearchBar({
  mode,
  value,
  onChange,
  onSubmit,
  onScan,
  onBack,
}: Props) {
  const placeholder =
    mode === "product"
      ? "搜索产品名称 / 条码"
      : mode === "inventory"
        ? "搜索产品名 / 库存单元码 / 条码"
        : mode === "purchase-order"
          ? "搜索供应商 / 单号 / 产品名"
          : mode === "sale-order"
            ? "搜索客户 / 单号 / 库存单元名"
            : mode === "customer"
              ? "搜索客户名称"
              : mode === "supplier"
                ? "搜索供应商名称"
                : "搜索储存点名称";

  return (
    <View className="flex-row p-3 gap-2 bg-card border-b border-border">
      <Button variant="ghost" size="icon" onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={THEME.light.foreground} />
      </Button>
      <TextInput
        className="flex-1 bg-background rounded-lg px-3 py-2 text-sm"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={THEME.light.mutedForeground}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus
      />
      <Button variant="outline" size="icon" onPress={onScan}>
        <Ionicons name="scan" size={20} color={THEME.light.primary} />
      </Button>
      <Button size="icon" onPress={onSubmit}>
        <Ionicons
          name="search"
          size={20}
          color={THEME.light.primaryForeground}
        />
      </Button>
    </View>
  );
}
