import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface OrderItemCardProps {
  title: string;
  subtitle?: string;
  quantity: string;
  unitPrice: string;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onDelete: () => void;
}

/** 单个订单行项目卡片 */
export function OrderItemCard({
  title,
  subtitle,
  quantity,
  unitPrice,
  onQuantityChange,
  onUnitPriceChange,
  onDelete,
}: OrderItemCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity style={styles.deleteHit} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>数量</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={onQuantityChange}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>单价</Text>
          <TextInput
            style={styles.input}
            value={unitPrice}
            onChangeText={onUnitPriceChange}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: "600", color: COLORS.text, flex: 1 },
  subtitle: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  deleteHit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 44,
  },
});
