import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { COLORS } from "@abacusflow/utils";

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/** 通用标签组件 */
export function Badge({
  label,
  color = COLORS.primary,
  bgColor = COLORS.primaryLight,
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

/** 状态标签组件 */
export function StatusBadge({
  label,
  color,
  bgColor,
}: {
  label: string;
  color: string;
  bgColor: string;
}) {
  return <Badge label={label} color={color} bgColor={bgColor} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
