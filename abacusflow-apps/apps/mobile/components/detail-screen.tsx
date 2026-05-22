import React from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOW } from "@abacusflow/utils";

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
    Alert.alert("确认删除", `确定删除？`, [
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{emptyMessage}</Text>
      </View>
    );
  }

  const badgeInfo = badge?.(data);
  const infoFields = fields(data);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title(data)}</Text>
          {badgeInfo && (
            <View style={[styles.badge, { backgroundColor: badgeInfo.bgColor }]}>
              <Text style={[styles.badgeText, { color: badgeInfo.color }]}>
                {badgeInfo.text}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {infoFields.map((field, idx) =>
            field.value != null && field.value !== "" ? (
              <View
                key={idx}
                style={[styles.infoRow, idx < infoFields.length - 1 && styles.infoBorder]}
              >
                <Text style={styles.infoLabel}>{field.label}</Text>
                <Text style={styles.infoValue}>{String(field.value)}</Text>
              </View>
            ) : null
          )}
        </View>

        {children}

        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={onEdit}>
                <Text style={styles.editBtnText}>{editLabel}</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>{deleteLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: COLORS.textTertiary, textAlign: "center", marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    ...SHADOW.card,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 14, color: COLORS.textTertiary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  editBtn: { backgroundColor: COLORS.primary },
  editBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deleteBtn: { backgroundColor: COLORS.dangerLight, borderWidth: 1, borderColor: "#ffccc7" },
  deleteBtnText: { color: COLORS.danger, fontSize: 15, fontWeight: "600" },
});
