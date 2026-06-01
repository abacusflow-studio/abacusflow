import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Text } from "@components/ui/text";
import { cn } from "@lib/utils";
import { THEME } from "@lib/theme";

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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="gap-5 p-4 pb-8">
          {fields.map((field) => {
            const isTextArea = field.type === "textarea";

            return (
              <View key={field.key} className="gap-2">
                <Text className="text-sm font-semibold">
                  {field.label}
                  {field.required && (
                    <Text className="text-destructive"> *</Text>
                  )}
                </Text>

                {field.type === "switch" ? (
                  <Card className="py-0">
                    <CardContent className="flex-row items-center justify-between px-4 py-3">
                      <Text className="text-sm">
                        {values[field.key] ? "启用" : "禁用"}
                      </Text>
                      <Switch
                        value={!!values[field.key]}
                        onValueChange={(v) => setValue(field.key, v)}
                        trackColor={{ true: THEME.light.primary }}
                      />
                    </CardContent>
                  </Card>
                ) : field.type === "image" ? (
                  <View className="flex-row flex-wrap gap-2">
                    {(imageUris[field.key] || []).map((uri, idx) => (
                      <View key={uri} className="relative h-20 w-20">
                        <RNImage
                          source={{ uri }}
                          className="h-20 w-20 rounded-lg bg-card"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-card"
                          onPress={() => removeImage(field.key, idx)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={THEME.light.destructive}
                          />
                        </Button>
                      </View>
                    ))}
                    {(imageUris[field.key] || []).length <
                      (field.maxImages || 9) && (
                      <Button
                        variant="outline"
                        className="h-20 w-20 flex-col gap-1 border-dashed"
                        onPress={() =>
                          pickImage(field.key, field.maxImages || 9)
                        }
                      >
                        <Ionicons
                          name="camera-outline"
                          size={28}
                          color={THEME.light.mutedForeground}
                        />
                        <Text className="text-xs text-muted-foreground">
                          添加
                        </Text>
                      </Button>
                    )}
                  </View>
                ) : field.type === "select" ? (
                  <View className="flex-row flex-wrap gap-2">
                    {field.options?.map((opt) => {
                      const active = values[field.key] === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onPress={() => setValue(field.key, opt.value)}
                        >
                          <Text>{opt.label}</Text>
                        </Button>
                      );
                    })}
                  </View>
                ) : (
                  <Input
                    className={cn(
                      "bg-card",
                      isTextArea && "min-h-28 py-3 align-top",
                    )}
                    value={
                      field.type === "number"
                        ? (textValues[field.key] ?? "")
                        : String(values[field.key] ?? "")
                    }
                    onChangeText={(text) => {
                      if (field.type === "number") {
                        setTextValues((prev) => ({
                          ...prev,
                          [field.key]: text,
                        }));
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
                    keyboardType={
                      field.type === "number" ? "numeric" : "default"
                    }
                    multiline={isTextArea}
                    numberOfLines={isTextArea ? 4 : 1}
                    textAlignVertical={isTextArea ? "top" : "center"}
                  />
                )}
              </View>
            );
          })}

          <Button
            className="mt-1 h-12"
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={THEME.light.primaryForeground} />
            ) : (
              <Text className="text-base">{submitLabel}</Text>
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
