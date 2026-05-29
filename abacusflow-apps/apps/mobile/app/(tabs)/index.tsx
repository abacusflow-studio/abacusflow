import { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import { listAllDrafts } from "@/lib/draft-store";

export default function EntryScreen() {
  const router = useRouter();
  const [draftCount, setDraftCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      checkDrafts();
    }, []),
  );

  const checkDrafts = async () => {
    try {
      const drafts = await listAllDrafts();
      setDraftCount(drafts.length);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Draft banner */}
        {draftCount > 0 && (
          <TouchableOpacity
            style={styles.draftBanner}
            onPress={() => router.push("/(tabs)/drafts" as any)}
          >
            <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
            <Text style={styles.draftBannerText}>
              有 {draftCount} 条未提交草稿，继续处理
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Main entry actions */}
        <Text style={styles.sectionTitle}>扫码录入</Text>

        <TouchableOpacity
          style={styles.mainAction}
          onPress={() => router.push("/entry/purchase" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.mainActionLeft}>
            <View
              style={[
                styles.mainActionIcon,
                { backgroundColor: COLORS.primaryLight },
              ]}
            >
              <Ionicons
                name="download-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>
            <View>
              <Text style={styles.mainActionTitle}>扫码入库</Text>
              <Text style={styles.mainActionDesc}>
                扫描条码，创建采购入库单
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={COLORS.textDisabled}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainAction}
          onPress={() => router.push("/entry/sale" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.mainActionLeft}>
            <View
              style={[
                styles.mainActionIcon,
                { backgroundColor: COLORS.successLight },
              ]}
            >
              <Ionicons
                name="arrow-up-outline"
                size={28}
                color={COLORS.success}
              />
            </View>
            <View>
              <Text style={styles.mainActionTitle}>扫码出库</Text>
              <Text style={styles.mainActionDesc}>
                扫描条码，创建销售出库单
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={COLORS.textDisabled}
          />
        </TouchableOpacity>

        {/* Secondary actions */}
        <Text style={styles.sectionTitle}>其他操作</Text>
        <View style={styles.secondaryGrid}>
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={() => router.push("/entry/product" as any)}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.secondaryTitle}>新品建档</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={() => router.push("/(tabs)/lookup" as any)}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={COLORS.textSecondary}
            />
            <Text style={styles.secondaryTitle}>扫码查库存</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  draftBannerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginBottom: 10,
    marginTop: 8,
  },
  mainAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mainActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  mainActionDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  secondaryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});
