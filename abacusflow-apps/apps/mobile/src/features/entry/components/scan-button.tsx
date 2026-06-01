import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface Props {
  label: string;
  onPress: () => void;
  onManualSelect?: () => void;
}

/** 扫码添加产品按钮（带可选手动选择） */
export function ScanButton({ label, onPress, onManualSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.scanBtn} onPress={onPress}>
        <Ionicons name="scan" size={22} color="#fff" />
        <Text style={styles.scanBtnText}>{label}</Text>
      </TouchableOpacity>
      {onManualSelect && (
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={onManualSelect}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="list-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.manualText}>手动选择</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 4,
  },
  manualText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});
