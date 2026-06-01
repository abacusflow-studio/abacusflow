import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { COLORS } from "@abacusflow/utils";

interface Props {
  editing: boolean;
  safetyStock: string;
  maxStock: string;
  displaySafetyStock: number | undefined;
  displayMaxStock: number | undefined;
  onSafetyStockChange: (value: string) => void;
  onMaxStockChange: (value: string) => void;
  onToggle: () => void;
  onSave: () => void;
}

/** 预警线显示/编辑区域 */
export function WarningLineEditor({
  editing,
  safetyStock,
  maxStock,
  displaySafetyStock,
  displayMaxStock,
  onSafetyStockChange,
  onMaxStockChange,
  onToggle,
  onSave,
}: Props) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>预警线设置</Text>
        <TouchableOpacity onPress={onToggle}>
          <Text style={styles.sectionAction}>
            {editing ? "取消" : "编辑"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {editing ? (
          <View style={styles.formGroup}>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>安全库存</Text>
              <TextInput
                style={styles.formInput}
                value={safetyStock}
                onChangeText={onSafetyStockChange}
                keyboardType="numeric"
                placeholder="最低库存量"
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>最大库存</Text>
              <TextInput
                style={styles.formInput}
                value={maxStock}
                onChangeText={onMaxStockChange}
                keyboardType="numeric"
                placeholder="最大库存量"
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>安全库存</Text>
              <Text style={styles.infoValue}>
                {displaySafetyStock ?? "-"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>最大库存</Text>
              <Text style={styles.infoValue}>
                {displayMaxStock ?? "-"}
              </Text>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  sectionAction: { fontSize: 14, color: COLORS.primary },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: { gap: 12 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  formLabel: { fontSize: 14, color: COLORS.text, width: 80 },
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 14, color: COLORS.textTertiary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
});
