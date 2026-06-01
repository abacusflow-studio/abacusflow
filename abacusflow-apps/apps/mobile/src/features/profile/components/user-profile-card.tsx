import { View } from "react-native";

import { Card, CardContent } from "@components/ui/card";
import { Text } from "@components/ui/text";

interface Props {
  displayName: string;
  displayEmail: string;
  avatarLetter: string;
  isAuthenticated: boolean;
}

/** 用户头像+姓名卡片 */
export function UserProfileCard({
  displayName,
  displayEmail,
  avatarLetter,
  isAuthenticated,
}: Props) {
  return (
    <Card className="py-0">
      <CardContent className="flex-row items-center gap-4 px-5 py-5">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-primary/10">
          <Text className="text-2xl font-bold text-primary">{avatarLetter}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold">{displayName}</Text>
          {displayEmail ? (
            <Text className="mt-1 text-sm text-muted-foreground">
              {displayEmail}
            </Text>
          ) : (
            <Text className="mt-1 text-sm text-muted-foreground">
              {isAuthenticated ? "已连接" : "未登录"}
            </Text>
          )}
        </View>
      </CardContent>
    </Card>
  );
}
