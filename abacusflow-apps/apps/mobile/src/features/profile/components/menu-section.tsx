import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";
import type { MenuSection as MenuSectionType } from "../types";

interface Props {
  section: MenuSectionType;
  onItemPress: (route: string) => void;
}

/** 菜单分区 */
export function MenuSection({ section, onItemPress }: Props) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-semibold uppercase text-muted-foreground">
        {section.title}
      </Text>
      <Card className="overflow-hidden py-0">
        <CardContent className="px-0 py-0">
          {section.items.map((item, idx) => (
            <Button
              key={item.label}
              variant="ghost"
              className="h-auto justify-start rounded-none px-4 py-4"
              onPress={() => onItemPress(item.route)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={THEME.light.mutedForeground}
              />
              <Text className="flex-1 text-base">{item.label}</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={THEME.light.mutedForeground}
              />
              {idx < section.items.length - 1 && (
                <View className="absolute bottom-0 left-12 right-0 h-hairline bg-border" />
              )}
            </Button>
          ))}
        </CardContent>
      </Card>
    </View>
  );
}
