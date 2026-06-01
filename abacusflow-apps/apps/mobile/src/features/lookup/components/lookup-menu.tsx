import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface Props {
  onScanPress: () => void;
  onProductPress: () => void;
  onInventoryPress: () => void;
  onOrderPress: () => void;
}

/** 查询模式选择菜单 */
export function LookupMenu({
  onScanPress,
  onProductPress,
  onInventoryPress,
  onOrderPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>查询</Text>
      <Text style={styles.hint}>查找产品、库存、订单信息</Text>

      <TouchableOpacity style={styles.scanBtn} onPress={onScanPress}>
        <Ionicons name="scan" size={28} color="#fff" />
        <View style={styles.scanText}>
          <Text style={styles.scanTitle}>扫码查库存</Text>
          <Text style={styles.scanDesc}>扫描条码查看产品库存</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={onProductPress}>
          <Ionicons name="cube-outline" size={28} color={COLORS.primary} />
          <Text style={styles.cardTitle}>查产品</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={onInventoryPress}>
          <Ionicons
            name="file-tray-outline"
            size={28}
            color={COLORS.success}
          />
          <Text style={styles.cardTitle}>查库存</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={onOrderPress}>
          <Ionicons
            name="receipt-outline"
            size={28}
            color={COLORS.warning}
          />
          <Text style={styles.cardTitle}>查单据</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  scanText: { flex: 1 },
  scanTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  scanDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  grid: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});
