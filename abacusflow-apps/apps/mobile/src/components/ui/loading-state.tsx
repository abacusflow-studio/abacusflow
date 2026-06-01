import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "@abacusflow/utils";

interface Props {
  message?: string;
}

/** 加载中展示 */
export function LoadingState({ message }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  message: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
});
