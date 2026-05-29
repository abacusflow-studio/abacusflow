import { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { productApi } from "@abacusflow/core";
import { PRODUCT_UNITS, PRODUCT_TYPES, COLORS } from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";

type ProductType = (typeof PRODUCT_TYPES)[number]["value"];
type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

export default function AddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState(params.barcode || "");
  const [specification, setSpecification] = useState("");
  const [type, setType] = useState<ProductType>("material");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await productApi.listSelectableProductCategories();
      setCategories(res.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = (data: string) => {
    setBarcode(data);
    setScanning(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "请输入产品名称");
      return;
    }
    if (!barcode.trim()) {
      Alert.alert("提示", "请扫描或输入条码");
      return;
    }
    if (!categoryId) {
      Alert.alert("提示", "请选择类别");
      return;
    }

    setSubmitting(true);
    try {
      await productApi.addProduct({
        createProductInput: {
          name: name.trim(),
          type,
          barcode: barcode.trim(),
          categoryId,
          unit,
          specification: specification.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      router.back();
    } catch (err) {
      Alert.alert("错误", err instanceof Error ? err.message : "创建失败");
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Barcode Section */}
        <Text style={styles.sectionLabel}>条码</Text>
        <View style={styles.barcodeRow}>
          <TextInput
            style={[styles.input, styles.barcodeInput]}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="扫描或手动输入条码"
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScanning(true)}
          >
            <Ionicons name="scan" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        <Text style={styles.sectionLabel}>基本信息</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>产品名称 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="请输入产品名称"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>规格</Text>
            <TextInput
              style={styles.input}
              value={specification}
              onChangeText={setSpecification}
              placeholder="请输入规格"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>产品类型 *</Text>
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
            <Text style={styles.label}>单位 *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
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

          <View style={styles.field}>
            <Text style={styles.label}>类别 *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
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
            <Text style={styles.label}>备注</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={note}
              onChangeText={setNote}
              placeholder="请输入备注"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={styles.submitText}>创建产品</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  barcodeRow: {
    flexDirection: "row",
    gap: 8,
  },
  barcodeInput: { flex: 1 },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1677ff",
    justifyContent: "center",
    alignItems: "center",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    marginRight: 8,
  },
  chipActive: {
    borderColor: "#1677ff",
    backgroundColor: "#e6f4ff",
  },
  chipText: { fontSize: 13, color: "#666" },
  chipTextActive: { color: "#1677ff", fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1677ff",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
