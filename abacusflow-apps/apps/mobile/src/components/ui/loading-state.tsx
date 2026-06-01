import { ActivityIndicator, View } from "react-native";

import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  message?: string;
}

/** 加载中展示 */
export function LoadingState({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator size="large" color={THEME.light.primary} />
      {message && <Text className="text-sm text-muted-foreground">{message}</Text>}
    </View>
  );
}
