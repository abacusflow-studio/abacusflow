import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { productApi } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { PRODUCT_UNITS, PRODUCT_TYPES } from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { saveDraft, deleteDraft, listDrafts } from "@/lib/draft-store";

type ProductType = (typeof PRODUCT_TYPES)[number]["value"];
type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

export default function ProductEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    barcode?: string;
    draftId?: string;
    returnTo?: string;
  }>();

  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [draftId, setDraftId] = useState<string | undefined>(params.draftId);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState(params.barcode || "");
  const [type, setType] = useState<ProductType>("material");
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [specification, setSpecification] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  // Restore draft
  useEffect(() => {
    if (params.draftId) {
      restoreDraft(params.draftId);
    }
  }, [params.draftId]);

  const loadCategories = async () => {
    try {
      const res = await productApi.listSelectableProductCategories();
      setCategories(res.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error(err);
    }
  };

  const restoreDraft = async (id: string) => {
    const drafts = await listDrafts("product");
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    const p = draft.payload;
    setName((p.name as string) || "");
    setBarcode((p.barcode as string) || "");
    setType((p.type as ProductType) || "material");
    setUnit((p.unit as ProductUnit) || "piece");
    setSpecification((p.specification as string) || "");
    setCategoryId(p.categoryId as number | undefined);
    setNote((p.note as string) || "");
    setDraftId(id);
  };

  const autoSaveDraft = useCallback(async () => {
    if (!name.trim() && !barcode.trim()) return;
    const summary = name.trim() || barcode || "未命名产品";
    const payload = {
      name,
      barcode,
      type,
      unit,
      specification,
      categoryId,
      note,
    };
    if (draftId) {
      const { updateDraft } = await import("@/lib/draft-store");
      await updateDraft("product", draftId, { payload, summary });
    } else {
      const draft = await saveDraft("product", payload, summary);
      setDraftId(draft.id);
    }
  }, [draftId, name, barcode, type, unit, specification, categoryId, note]);

  const handleScan = (data: string) => {
    setBarcode(data);
    setScanning(false);
  };

  const handleSubmit = async (andEnter: boolean) => {
    if (!name.trim()) {
      Alert.alert("提示", "请输入产品名称");
      return;
    }
    if (!barcode.trim()) {
      Alert.alert("提示", "请扫描或输入条码");
      return;
    }

    setSubmitting(true);
    try {
      const product = await productApi.addProduct({
        createProductInput: {
          name: name.trim(),
          type,
          barcode: barcode.trim(),
          unit,
          categoryId: categoryId || 0,
          specification: specification.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      if (draftId) await deleteDraft("product", draftId);

      if (andEnter) {
        // Navigate to purchase entry with this product
        router.replace({
          pathname: "/entry/purchase",
          params: { scanProductId: String(product.id), scanBarcode: barcode },
        } as any);
      } else if (params.returnTo === "purchase") {
        router.replace({
          pathname: "/entry/purchase",
          params: { scanProductId: String(product.id), scanBarcode: barcode },
        } as any);
      } else if (params.returnTo === "sale") {
        router.replace({
          pathname: "/entry/sale",
          params: { scanProductId: String(product.id), scanBarcode: barcode },
        } as any);
      } else {
        router.back();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      if (draftId) {
        const { updateDraft } = await import("@/lib/draft-store");
        await updateDraft("product", draftId, {
          status: "failed",
          lastError: msg,
        });
      }
      Alert.alert("创建失败", msg + "\n\n已保存草稿");
    } finally {
      setSubmitting(false);
    }
  };

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => setScanning(false)}
        title="扫描产品条码"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barcode */}
          <Text style={styles.stepLabel}>条码</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="扫描或手动输入"
            />
            <TouchableOpacity
              style={styles.scanIconBtn}
              onPress={() => setScanning(true)}
            >
              <Ionicons name="scan" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Required fields */}
          <Text style={styles.stepLabel}>必填信息</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>产品名称</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="请输入产品名称"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>类型</Text>
            <View style={styles.chipRow}>
              {PRODUCT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      type === t.value && styles.chipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>单位</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRODUCT_UNITS.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  style={[styles.chip, unit === u.value && styles.chipActive]}
                  onPress={() => setUnit(u.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      unit === u.value && styles.chipTextActive,
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* More fields */}
          <TouchableOpacity
            style={styles.moreToggle}
            onPress={() => setShowMore(!showMore)}
          >
            <Text style={styles.moreToggleText}>
              {showMore ? "收起" : "更多信息（可稍后补充）"}
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {showMore && (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>规格</Text>
                <TextInput
                  style={styles.input}
                  value={specification}
                  onChangeText={setSpecification}
                  placeholder="可选"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>类别</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        categoryId === c.id && styles.chipActive,
                      ]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          categoryId === c.id && styles.chipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>备注</Text>
                <TextInput
                  style={[
                    styles.input,
                    { minHeight: 80, textAlignVertical: "top" },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="可选"
                  multiline
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.saveBtn]}
            onPress={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>保存</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.enterBtn]}
            onPress={() => handleSubmit(true)}
            disabled={submitting}
          >
            <Text style={styles.enterBtnText}>保存并入库</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 16 },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginTop: 12,
  },
  barcodeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  scanIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 44,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    marginRight: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 14, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  moreToggleText: { fontSize: 13, color: COLORS.textTertiary },
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtnText: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  enterBtn: { backgroundColor: COLORS.primary },
  enterBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
