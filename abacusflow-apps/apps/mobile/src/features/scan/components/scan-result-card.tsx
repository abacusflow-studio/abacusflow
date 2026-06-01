import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import type { SelectableProduct } from "@abacusflow/core";

interface Props {
  barcode: string;
  product: SelectableProduct | null;
  onPurchase: () => void;
  onSale: () => void;
  onCreateProduct: () => void;
}

/** 扫码结果卡片 */
export function ScanResultCard({
  barcode,
  product,
  onPurchase,
  onSale,
  onCreateProduct,
}: Props) {
  return (
    <View style={styles.content}>
      {/* 条码 */}
      <View style={styles.barcodeCard}>
        <Ionicons name="barcode-outline" size={22} color={COLORS.primary} />
        <Text style={styles.barcodeText}>{barcode}</Text>
      </View>

      {product ? (
        <View style={styles.resultCard}>
          <View style={styles.productRow}>
            <Ionicons name="cube" size={28} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>
                {product.type === "asset" ? "资产" : "物料"} ·{" "}
                {product.barcode}
              </Text>
            </View>
            <View style={styles.foundBadge}>
              <Text style={styles.foundBadgeText}>已存在</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={onPurchase}>
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: COLORS.primaryLight },
              ]}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>入库</Text>
              <Text style={styles.actionDesc}>创建采购入库单</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textDisabled}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onSale}>
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: COLORS.successLight },
              ]}
            >
              <Ionicons
                name="arrow-up-outline"
                size={22}
                color={COLORS.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>出库</Text>
              <Text style={styles.actionDesc}>
                创建销售出库单
                {product.type === "asset" ? "，需确认SN" : ""}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textDisabled}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultCard}>
          <View style={styles.notFoundWrap}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={COLORS.warning}
            />
            <Text style={styles.notFoundTitle}>产品未录入</Text>
            <Text style={styles.notFoundDesc}>该条码尚未注册</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onCreateProduct}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>建档并入库</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16, gap: 16 },
  barcodeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  barcodeText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },
  resultCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  productMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  foundBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  foundBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: "600" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notFoundWrap: { alignItems: "center", paddingVertical: 12, gap: 6 },
  notFoundTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  notFoundDesc: { fontSize: 14, color: COLORS.textSecondary },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
