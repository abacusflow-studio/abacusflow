import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

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
    <View className="items-center gap-2 px-6 py-16">
      <Ionicons name={icon} size={48} color={THEME.light.mutedForeground} />
      <Text className="mt-2 text-center text-sm font-medium text-muted-foreground">
        {message}
      </Text>
      {hint && (
        <Text className="text-center text-xs text-muted-foreground">
          {hint}
        </Text>
      )}
    </View>
  );
}
