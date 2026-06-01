import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface Props {
  label: string;
  onPress: () => void;
}

/** 扫码添加产品按钮 */
export function ScanButton({ label, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.scanBtn} onPress={onPress}>
      <Ionicons name="scan" size={22} color="#fff" />
      <Text style={styles.scanBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
