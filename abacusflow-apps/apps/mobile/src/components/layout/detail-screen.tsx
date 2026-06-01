import React from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { ErrorState } from "@components/ui/error-state";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

export interface InfoField {
  label: string;
  value: string | number | undefined | null;
}

interface DetailScreenProps<T> {
  loading: boolean;
  data: T | null;
  emptyMessage?: string;
  title: (data: T) => string;
  badge?: (data: T) => { text: string; color: string; bgColor: string } | null;
  fields: (data: T) => InfoField[];
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  children?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
}

export function DetailScreen<T>({
  loading,
  data,
  emptyMessage = "数据不存在",
  title,
  badge,
  fields,
  onEdit,
  onDelete,
  editLabel = "编辑",
  deleteLabel = "删除",
  children,
  error,
  onRetry,
}: DetailScreenProps<T>) {
  const handleDelete = () => {
    Alert.alert("确认删除", "确定删除？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={THEME.light.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorState message={error} onRetry={onRetry} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">{emptyMessage}</Text>
      </View>
    );
  }

  const badgeInfo = badge?.(data);
  const infoFields = fields(data).filter(
    (field) => field.value != null && field.value !== "",
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="flex-row items-center gap-3">
          <Text variant="h3" className="flex-1 text-left text-2xl">
            {title(data)}
          </Text>
          {badgeInfo && (
            <View
              className="rounded-md px-3 py-1"
              style={{ backgroundColor: badgeInfo.bgColor }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: badgeInfo.color }}
              >
                {badgeInfo.text}
              </Text>
            </View>
          )}
        </View>

        <Card className="py-0">
          <CardContent className="px-4 py-2">
            {infoFields.map((field, idx) => (
              <View
                key={`${field.label}-${idx}`}
                className="flex-row items-center justify-between gap-4 border-border py-3"
                style={{
                  borderBottomWidth: idx < infoFields.length - 1 ? 1 : 0,
                }}
              >
                <Text className="text-sm text-muted-foreground">{field.label}</Text>
                <Text className="flex-1 text-right text-sm font-medium">
                  {String(field.value)}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        {children}

        {(onEdit || onDelete) && (
          <View className="mt-2 flex-row gap-3">
            {onEdit && (
              <Button className="h-12 flex-1" onPress={onEdit}>
                <Text>{editLabel}</Text>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                className="h-12 flex-1"
                onPress={handleDelete}
              >
                <Text>{deleteLabel}</Text>
              </Button>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
