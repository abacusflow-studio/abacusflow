import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "@abacusflow/utils";

interface Props {
  itemCount: number;
  totalAmount: number;
  submitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
}

/** 底部粘性栏（数量/总计/提交） */
export function OrderBottomBar({
  itemCount,
  totalAmount,
  submitting,
  submitLabel,
  onSubmit,
}: Props) {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomCount}>{itemCount} 项</Text>
        <Text style={styles.bottomTotal}>
          ¥{totalAmount.toLocaleString("zh-CN")}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomInfo: { flex: 1 },
  bottomCount: { fontSize: 13, color: COLORS.textSecondary },
  bottomTotal: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
