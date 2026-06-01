import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import type { LookupMode } from "../types";

interface Props {
  mode: Exclude<LookupMode, "menu">;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onScan: () => void;
  onBack: () => void;
}

/** 查询搜索栏 */
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
        : "搜索供应商 / 客户 / 单号";

  return (
    <View style={styles.searchBar}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus
      />
      <TouchableOpacity onPress={onScan} style={styles.scanBtn}>
        <Ionicons name="scan" size={20} color={COLORS.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onSubmit} style={styles.searchBtn}>
        <Ionicons name="search" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { justifyContent: "center", paddingHorizontal: 4 },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
