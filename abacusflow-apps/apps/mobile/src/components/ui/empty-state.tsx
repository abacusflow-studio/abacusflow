import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  hint?: string;
}

/** 空状态展示 */
export function EmptyState({
  icon = "document-text-outline",
  message,
  hint,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={COLORS.textDisabled} />
      <Text style={styles.message}>{message}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  message: { fontSize: 15, color: COLORS.textTertiary, marginTop: 8 },
  hint: { fontSize: 13, color: COLORS.textDisabled },
});
