import { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import {
  listAllDrafts,
  deleteDraft,
  type Draft,
  type DraftType,
} from "@/lib/draft-store";

const TYPE_LABELS: Record<DraftType, string> = {
  purchase: "入库",
  sale: "出库",
  product: "新品建档",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  in_progress: {
    label: "未完成",
    bg: COLORS.warningLight,
    color: COLORS.warning,
  },
  pending: { label: "待提交", bg: COLORS.primaryLight, color: COLORS.primary },
  failed: { label: "提交失败", bg: COLORS.dangerLight, color: COLORS.danger },
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
    Alert.alert("删除草稿", "确定要删除这条草稿吗？", [
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

  const renderItem = ({ item }: { item: Draft }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.in_progress;
    const timeStr = new Date(item.updatedAt).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleResume(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{TYPE_LABELS[item.type]}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusTagText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
        <Text style={styles.summary} numberOfLines={1}>
          {item.summary}
        </Text>
        {item.lastError && (
          <Text style={styles.errorText} numberOfLines={1}>
            {item.lastError}
          </Text>
        )}
        <Text style={styles.timeText}>{timeStr}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={COLORS.textDisabled}
          />
          <Text style={styles.emptyText}>暂无草稿</Text>
          <Text style={styles.emptyHint}>录入中断或失败的单据会保存在这里</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={loadDrafts}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: { fontSize: 12, fontWeight: "500" },
  summary: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  errorText: { fontSize: 13, color: COLORS.danger, marginBottom: 4 },
  timeText: { fontSize: 12, color: COLORS.textTertiary },
  emptyText: { fontSize: 15, color: COLORS.textTertiary, marginTop: 8 },
  emptyHint: { fontSize: 13, color: COLORS.textDisabled },
});
