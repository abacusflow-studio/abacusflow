import { useState, useCallback } from "react";
import { FlatList, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";
import {
  listAllDrafts,
  deleteDraft,
  type Draft,
  type DraftType,
} from "@lib/draft-store";

const TYPE_LABELS: Record<DraftType, string> = {
  purchase: "入库",
  sale: "出库",
  product: "新品建档",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  in_progress: { label: "未完成", bg: "#fef9c3", color: "#ca8a04" },
  pending: { label: "待提交", bg: "#dcfce7", color: THEME.light.primary },
  failed: { label: "提交失败", bg: "#fee2e2", color: THEME.light.destructive },
};

export default function DraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, []),
  );

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await listAllDrafts();
      setDrafts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (draft: Draft) => {
    switch (draft.type) {
      case "purchase":
        router.push({
          pathname: "/entry/purchase",
          params: { draftId: draft.id },
        } as any);
        break;
      case "sale":
        router.push({
          pathname: "/entry/sale",
          params: { draftId: draft.id },
        } as any);
        break;
      case "product":
        router.push({
          pathname: "/entry/product",
          params: { draftId: draft.id },
        } as any);
        break;
    }
  };

  const handleDelete = (draft: Draft) => {
    Alert.alert("删除草稿", "确定删除这个草稿吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await deleteDraft(draft.type, draft.id);
          loadDrafts();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {loading ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text variant="muted">加载中...</Text>
        </View>
      ) : drafts.length === 0 ? (
        <EmptyState icon="document-text-outline" message="暂无草稿" />
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }) => {
            const statusCfg =
              STATUS_CONFIG[item.status] ?? STATUS_CONFIG.in_progress;
            return (
              <Card>
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Badge
                      label={TYPE_LABELS[item.type]}
                      color={THEME.light.primary}
                      bgColor={"#dcfce7"}
                    />
                    <Badge
                      label={statusCfg.label}
                      color={statusCfg.color}
                      bgColor={statusCfg.bg}
                    />
                    <Text variant="muted" className="text-xs flex-1 text-right">
                      {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </Text>
                  </View>
                  <Text className="text-base font-semibold mb-1">
                    {item.summary}
                  </Text>
                  {item.lastError && (
                    <Text
                      className="text-sm mt-1"
                      style={{ color: THEME.light.destructive }}
                    >
                      {item.lastError}
                    </Text>
                  )}
                  <View className="flex-row gap-2 mt-3">
                    <Button
                      variant="outline"
                      onPress={() => handleResume(item)}
                      className="flex-1"
                    >
                      <Ionicons
                        name="play-outline"
                        size={16}
                        color={THEME.light.primary}
                      />
                      <Text
                        className="text-sm"
                        style={{ color: THEME.light.primary }}
                      >
                        继续
                      </Text>
                    </Button>
                    <Button
                      variant="destructive"
                      onPress={() => handleDelete(item)}
                      className="flex-1"
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text className="text-sm text-white">删除</Text>
                    </Button>
                  </View>
                </CardContent>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
