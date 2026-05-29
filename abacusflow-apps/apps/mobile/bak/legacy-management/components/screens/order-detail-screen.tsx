import React from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PurchaseOrder, SaleOrder } from "@abacusflow/core";
import { translateOrderStatus, dateToFormattedString } from "@abacusflow/utils";
import { STATUS_COLORS, COLORS } from "@abacusflow/utils";

type Order = PurchaseOrder | SaleOrder;
type DetailOrderItem =
  | PurchaseOrder["orderItems"][number]
  | SaleOrder["orderItems"][number];

interface OrderDetailScreenProps<T extends Order> {
  loading: boolean;
  data: T | null;
  emptyMessage?: string;
  partnerLabel: string;
  partnerName: string;
  extraFields?: { label: string; value: string }[];
  onComplete?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onReverse?: () => Promise<void>;
}

export function OrderDetailScreen<T extends Order>({
  loading,
  data,
  emptyMessage = "订单不存在",
  partnerLabel,
  partnerName,
  extraFields,
  onComplete,
  onCancel,
  onReverse,
}: OrderDetailScreenProps<T>) {
  const handleAction = (action: "complete" | "cancel" | "reverse") => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    Alert.alert("确认操作", `确定${labels[action]}该订单？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        onPress: async () => {
          try {
            if (action === "complete" && onComplete) await onComplete();
            if (action === "cancel" && onCancel) await onCancel();
            if (action === "reverse" && onReverse) await onReverse();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{emptyMessage}</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[data.status]?.color || "#999";
  const statusBg = STATUS_COLORS[data.status]?.bg || "#f0f0f0";
  const totalAmount = data.orderItems.reduce(
    (sum, item) => sum + (item.subtotal ?? 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.orderNo}>{data.orderNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {translateOrderStatus(data.status)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow
            label="订单日期"
            value={dateToFormattedString(data.orderDate)}
          />
          <InfoRow label={partnerLabel} value={partnerName} />
          {extraFields?.map((field) => (
            <InfoRow
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
          {totalAmount > 0 && (
            <InfoRow
              label="总金额"
              value={`¥${totalAmount.toLocaleString("zh-CN")}`}
              valueStyle={styles.amount}
            />
          )}
        </View>

        <Text style={styles.sectionTitle}>订单明细</Text>
        <View style={styles.card}>
          {data.orderItems.map((item, idx) => (
            <OrderItemRow
              key={item.id ?? idx}
              item={item}
              isLast={idx === data.orderItems.length - 1}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {data.status === "pending" && onComplete && onCancel && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                onPress={() => handleAction("complete")}
              >
                <Text style={styles.actionBtnText}>完成</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => handleAction("cancel")}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>
                  取消
                </Text>
              </TouchableOpacity>
            </>
          )}
          {data.status === "completed" && onReverse && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.reverseBtn]}
              onPress={() => handleAction("reverse")}
            >
              <Text style={[styles.actionBtnText, { color: "#666" }]}>
                撤回
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function OrderItemRow({
  item,
  isLast,
}: {
  item: DetailOrderItem;
  isLast: boolean;
}) {
  const title =
    "productName" in item
      ? item.productName
      : (item.inventoryUnitTitle ?? `库存单元#${item.inventoryUnitId}`);

  return (
    <View style={[styles.itemRow, !isLast && styles.itemBorder]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{title}</Text>
        {"serialNumber" in item && item.serialNumber && (
          <Text style={styles.itemSerial}>序列号: {item.serialNumber}</Text>
        )}
      </View>
      <View style={styles.itemNumbers}>
        <Text style={styles.itemQty}>x{item.quantity}</Text>
        <Text style={styles.itemPrice}>
          ¥{item.unitPrice.toLocaleString("zh-CN")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: COLORS.textTertiary },
  content: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  orderNo: { fontSize: 18, fontWeight: "700", color: COLORS.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 14, color: COLORS.textTertiary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  amount: { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  itemSerial: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  itemNumbers: { alignItems: "flex-end" },
  itemQty: { fontSize: 14, color: "#666" },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    backgroundColor: "#fff1f0",
    borderWidth: 1,
    borderColor: "#ffccc7",
  },
  reverseBtn: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },
});
