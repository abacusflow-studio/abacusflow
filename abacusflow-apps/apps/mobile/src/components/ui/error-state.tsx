import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@components/ui/button";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  message: string;
  onRetry?: () => void;
}

/** 错误展示 */
export function ErrorState({ message, onRetry }: Props) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={THEME.light.destructive}
      />
      <Text className="text-center text-sm text-muted-foreground">
        {message}
      </Text>
      {onRetry && (
        <Button className="mt-2 min-w-28" onPress={onRetry}>
          <Text>重试</Text>
        </Button>
      )}
    </View>
  );
}
