import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "@abacusflow/utils";
import type { PartnerOption } from "../types";

interface Props {
  partners: PartnerOption[];
  selectedId?: number;
  onSelect: (id: number) => void;
  label: string;
}

/** 横向滚动的合作伙伴选择器 */
export function PartnerChipSelector({
  partners,
  selectedId,
  onSelect,
  label,
}: Props) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {partners.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedId === p.id && styles.chipActive]}
            onPress={() => onSelect(p.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedId === p.id && styles.chipTextActive,
              ]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 8,
  },
  scroll: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    marginRight: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 14, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },
});
