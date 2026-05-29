import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "@abacusflow/utils";

interface FieldOption {
  label: string;
  value: string | number;
}

interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "switch" | "textarea" | "image";
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  value?: string | number | boolean;
  maxImages?: number;
}

interface FormScreenProps {
  title: string;
  fields: FormField[];
  initialValues?: Record<string, string | number | boolean | undefined>;
  onSubmit: (
    values: Record<string, string | number | boolean | undefined>,
  ) => Promise<void>;
  submitLabel?: string;
}

export function FormScreen({
  fields,
  initialValues,
  onSubmit,
  submitLabel = "保存",
}: FormScreenProps) {
  const router = useRouter();
  const [values, setValues] = useState<
    Record<string, string | number | boolean | undefined>
  >(() => {
    const initial: Record<string, string | number | boolean | undefined> = {};
    for (const field of fields) {
      initial[field.key] =
        initialValues?.[field.key] ??
        field.value ??
        (field.type === "switch" ? false : "");
    }
    return initial;
  });
  // Track raw text for number fields to allow decimal input
  const [textValues, setTextValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "number") {
        const val = initialValues?.[field.key] ?? field.value;
        initial[field.key] = val != null ? String(val) : "";
      }
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageUris, setImageUris] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const field of fields) {
      if (field.type === "image") {
        initial[field.key] = [];
      }
    }
    return initial;
  });

  const pickImage = useCallback(
    async (fieldKey: string, maxImages: number) => {
      const current = imageUris[fieldKey] || [];
      if (current.length >= maxImages) {
        Alert.alert("提示", `最多上传${maxImages}张图片`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - current.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        setImageUris((prev) => ({
          ...prev,
          [fieldKey]: [...current, ...newUris].slice(0, maxImages),
        }));
      }
    },
    [imageUris],
  );

  const removeImage = useCallback((fieldKey: string, index: number) => {
    setImageUris((prev) => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || []).filter((_, i) => i !== index),
    }));
  }, []);

  const setValue = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = async () => {
    // Validate required fields
    for (const field of fields) {
      if (field.type === "image") {
        if (field.required && (imageUris[field.key] || []).length === 0) {
          Alert.alert("提示", `请选择${field.label}`);
          return;
        }
        continue;
      }
      if (field.required && !values[field.key] && values[field.key] !== 0) {
        Alert.alert("提示", `请填写${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const allValues = { ...values };
      for (const field of fields) {
        if (field.type === "image") {
          allValues[field.key] = JSON.stringify(imageUris[field.key] || []);
        }
      }
      await onSubmit(allValues);
      router.back();
    } catch (err) {
      Alert.alert("错误", err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>

              {field.type === "switch" ? (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>
                    {values[field.key] ? "启用" : "禁用"}
                  </Text>
                  <Switch
                    value={!!values[field.key]}
                    onValueChange={(v) => setValue(field.key, v)}
                    trackColor={{ true: COLORS.primary }}
                  />
                </View>
              ) : field.type === "image" ? (
                <View>
                  <View style={styles.imageGrid}>
                    {(imageUris[field.key] || []).map((uri, idx) => (
                      <View key={idx} style={styles.imageItem}>
                        <RNImage source={{ uri }} style={styles.imageThumb} />
                        <TouchableOpacity
                          style={styles.imageRemove}
                          onPress={() => removeImage(field.key, idx)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={COLORS.danger}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {(imageUris[field.key] || []).length <
                      (field.maxImages || 9) && (
                      <TouchableOpacity
                        style={styles.imageAdd}
                        onPress={() =>
                          pickImage(field.key, field.maxImages || 9)
                        }
                      >
                        <Ionicons
                          name="camera-outline"
                          size={28}
                          color={COLORS.textTertiary}
                        />
                        <Text style={styles.imageAddText}>添加</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : field.type === "select" ? (
                <View style={styles.selectGroup}>
                  {field.options?.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.selectOption,
                        values[field.key] === opt.value &&
                          styles.selectOptionActive,
                      ]}
                      onPress={() => setValue(field.key, opt.value)}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          values[field.key] === opt.value &&
                            styles.selectOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.input,
                    field.type === "textarea" && styles.textarea,
                  ]}
                  value={
                    field.type === "number"
                      ? (textValues[field.key] ?? "")
                      : String(values[field.key] ?? "")
                  }
                  onChangeText={(text) => {
                    if (field.type === "number") {
                      setTextValues((prev) => ({ ...prev, [field.key]: text }));
                      const num = Number(text);
                      setValue(
                        field.key,
                        text === ""
                          ? undefined
                          : isNaN(num)
                            ? values[field.key]
                            : num,
                      );
                    } else {
                      setValue(field.key, text);
                    }
                  }}
                  placeholder={field.placeholder}
                  keyboardType={field.type === "number" ? "numeric" : "default"}
                  multiline={field.type === "textarea"}
                  numberOfLines={field.type === "textarea" ? 4 : 1}
                />
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{submitLabel}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  required: { color: COLORS.danger },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
  },
  switchLabel: { fontSize: 14, color: COLORS.text },
  selectGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    backgroundColor: COLORS.bgCard,
  },
  selectOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  selectOptionText: { fontSize: 13, color: COLORS.textSecondary },
  selectOptionTextActive: { color: COLORS.primary, fontWeight: "600" },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  imageItem: { position: "relative", width: 80, height: 80 },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
  },
  imageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  imageAdd: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderStyle: "dashed",
    backgroundColor: COLORS.bgCard,
    justifyContent: "center",
    alignItems: "center",
  },
  imageAddText: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
});
