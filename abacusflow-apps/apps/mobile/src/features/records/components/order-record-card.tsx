import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, formatCurrency } from "@abacusflow/utils";
import type { OrderRecord } from "../types";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  completed: {
    label: "已完成",
    bg: COLORS.successLight,
    color: COLORS.success,
  },
  pending: { label: "待处理", bg: COLORS.warningLight, color: COLORS.warning },
  canceled: { label: "已取消", bg: COLORS.bg, color: COLORS.textTertiary },
  reversed: { label: "已冲销", bg: COLORS.dangerLight, color: COLORS.danger },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  purchase: { label: "入库", color: COLORS.primary, bg: COLORS.primaryLight },
  sale: { label: "出库", color: COLORS.success, bg: COLORS.successLight },
};

interface Props {
  item: OrderRecord;
  onPress?: () => void;
}

/** 订单记录卡片 */
export function OrderRecordCard({ item, onPress }: Props) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[item.type];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typeTag, { backgroundColor: typeCfg.bg }]}>
          <Text style={[styles.typeTagText, { color: typeCfg.color }]}>
            {typeCfg.label}
          </Text>
        </View>
        <Text style={styles.orderNo}>{item.orderNo}</Text>
        <View style={[styles.statusTag, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusTagText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.partyLabel}>
            {item.type === "purchase" ? "供应商" : "客户"}
          </Text>
          <Text style={styles.partyName}>{item.partyName || "-"}</Text>
        </View>
        <View style={styles.cardMetrics}>
          <Text style={styles.metric}>
            {item.itemCount} 种 · {item.totalQuantity} 件
          </Text>
          <Text style={styles.amount}>
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>
      </View>

      <Text style={styles.dateText}>{item.orderDate}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: { fontSize: 12, fontWeight: "600" },
  orderNo: { fontSize: 14, fontWeight: "600", color: COLORS.text, flex: 1 },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: { fontSize: 12, fontWeight: "500" },
  cardBody: { gap: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  partyLabel: { fontSize: 12, color: COLORS.textTertiary },
  partyName: { fontSize: 14, color: COLORS.text },
  cardMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metric: { fontSize: 13, color: COLORS.textSecondary },
  amount: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  dateText: { fontSize: 12, color: COLORS.textTertiary, marginTop: 8 },
});
