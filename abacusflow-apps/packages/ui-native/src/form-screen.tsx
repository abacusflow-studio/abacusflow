import { useState, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@abacusflow/ui-tokens";

interface FieldOption {
  label: string;
  value: string | number;
}

interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "switch" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  value?: string | number | boolean;
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
  title,
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

  const setValue = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = async () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.key] && values[field.key] !== 0) {
        Alert.alert("提示", `请填写${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
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
  selectOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
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
});
