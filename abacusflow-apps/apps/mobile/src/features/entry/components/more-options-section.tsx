import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface Props {
  showMore: boolean;
  onToggle: () => void;
  orderDate: string;
  onOrderDateChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  /** 额外的字段（如折扣系数） */
  extraFields?: React.ReactNode;
}

/** 可折叠的"更多信息"区域 */
export function MoreOptionsSection({
  showMore,
  onToggle,
  orderDate,
  onOrderDateChange,
  note,
  onNoteChange,
  extraFields,
}: Props) {
  return (
    <>
      <TouchableOpacity style={styles.moreToggle} onPress={onToggle}>
        <Text style={styles.moreToggleText}>
          {showMore ? "收起" : "更多信息"}
        </Text>
        <Ionicons
          name={showMore ? "chevron-up" : "chevron-down"}
          size={16}
          color={COLORS.textTertiary}
        />
      </TouchableOpacity>

      {showMore && (
        <>
          {extraFields}
          <Text style={styles.fieldLabel}>订单日期</Text>
          <TextInput
            style={styles.input}
            value={orderDate}
            onChangeText={onOrderDateChange}
            placeholder="YYYY-MM-DD"
          />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>备注</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={onNoteChange}
            placeholder="可选备注"
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  moreToggleText: { fontSize: 13, color: COLORS.textTertiary },
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
