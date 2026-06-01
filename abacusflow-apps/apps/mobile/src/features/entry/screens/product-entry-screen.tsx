import { useState, useEffect } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { productApi } from "@abacusflow/core";
import { PRODUCT_UNITS, PRODUCT_TYPES } from "@abacusflow/utils";

import { AnimatedCard } from "@components/ui/animated-card";
import { BarcodeScanner } from "@components/ui/barcode-scanner";
import { Button } from "@components/ui/button";
import { CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { PressableScale } from "@components/ui/pressable-scale";
import { Text } from "@components/ui/text";
import { deleteDraft, listDrafts } from "@lib/draft-store";
import { triggerHaptic } from "@lib/haptics";
import { THEME } from "@lib/theme";
import { cn } from "@lib/utils";

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

  const handleScan = (data: string) => {
    void triggerHaptic("selection");
    setBarcode(data);
    setScanning(false);
  };

  const handleSubmit = async (andEnter: boolean) => {
    if (!name.trim()) {
      void triggerHaptic("error");
      Alert.alert("提示", "请输入产品名称");
      return;
    }
    if (!barcode.trim()) {
      void triggerHaptic("error");
      Alert.alert("提示", "请扫描或输入条码");
      return;
    }
    if (!categoryId) {
      void triggerHaptic("error");
      Alert.alert("提示", "请选择类别");
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
          categoryId,
          specification: specification.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      if (draftId) await deleteDraft("product", draftId);

      void triggerHaptic("success");
      if (andEnter) {
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
        const { updateDraft } = await import("@lib/draft-store");
        await updateDraft("product", draftId, {
          status: "failed",
          lastError: msg,
        });
      }
      void triggerHaptic("error");
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-5 p-4 pb-5"
          keyboardShouldPersistTaps="handled"
        >
          <View className="overflow-hidden rounded-[22px] border border-border bg-card p-5">
            <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10" />
            <View className="flex-row items-start gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={THEME.light.primary}
                />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold">新品建档</Text>
                <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                  先扫条码，再补基础资料，后续可直接入库
                </Text>
              </View>
            </View>
          </View>

          <AnimatedCard index={0}>
            <CardContent className="gap-4 px-4 py-4">
              <StepTitle step="01" title="产品身份" desc="条码是现场流转的关键索引" />
              <View className="flex-row gap-3">
                <Input
                  className="h-12 flex-1 bg-background"
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="扫描或手动输入"
                />
                <PressableScale haptic="medium" onPress={() => setScanning(true)}>
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                    <Ionicons
                      name="scan"
                      size={22}
                      color={THEME.light.primaryForeground}
                    />
                  </View>
                </PressableScale>
              </View>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <CardContent className="gap-4 px-4 py-4">
              <StepTitle step="02" title="基础资料" desc="名称、类型、单位和分类" />
              <View className="gap-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  产品名称
                </Text>
                <Input
                  className="h-12 bg-background"
                  value={name}
                  onChangeText={setName}
                  placeholder="请输入产品名称"
                />
              </View>

              <View className="gap-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  规格
                </Text>
                <Input
                  className="h-12 bg-background"
                  value={specification}
                  onChangeText={setSpecification}
                  placeholder="可选"
                />
              </View>

              <ChoiceGroup
                label="类型"
                options={PRODUCT_TYPES}
                value={type}
                onChange={(value) => setType(value as ProductType)}
              />

              <ChoiceGroup
                label="单位"
                options={PRODUCT_UNITS}
                value={unit}
                onChange={(value) => setUnit(value as ProductUnit)}
                horizontal
              />

              <ChoiceGroup
                label="类别"
                options={categories.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                }))}
                value={categoryId ? String(categoryId) : ""}
                onChange={(value) => setCategoryId(Number(value))}
                horizontal
              />
            </CardContent>
          </AnimatedCard>

          <Button
            variant="ghost"
            className="h-10 justify-start gap-2 px-1"
            onPress={() => setShowMore(!showMore)}
          >
            <Text className="text-sm text-muted-foreground">
              {showMore ? "收起更多信息" : "更多信息（可稍后补充）"}
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={THEME.light.mutedForeground}
            />
          </Button>

          {showMore && (
            <AnimatedCard index={2}>
              <CardContent className="gap-4 px-4 py-4">
                <View className="gap-2">
                  <Text className="text-xs font-medium text-muted-foreground">
                    备注
                  </Text>
                  <Input
                    className="min-h-24 bg-background py-3"
                    value={note}
                    onChangeText={setNote}
                    placeholder="可选"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </CardContent>
            </AnimatedCard>
          )}
        </ScrollView>

        <View className="flex-row gap-3 border-t border-border bg-card px-4 py-3">
          <Button
            variant="outline"
            className="h-12 flex-1 bg-card"
            onPress={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={THEME.light.primary} size="small" />
            ) : (
              <Text className="font-semibold">保存</Text>
            )}
          </Button>
          <Button
            className="h-12 flex-1"
            onPress={() => handleSubmit(true)}
            disabled={submitting}
          >
            <Text className="font-bold">保存并入库</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepTitle({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="rounded-lg bg-primary/10 px-2 py-1">
        <Text className="text-xs font-bold text-primary">{step}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold">{title}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">{desc}</Text>
      </View>
    </View>
  );
}

interface ChoiceOption {
  label: string;
  value: string;
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  horizontal,
}: {
  label: string;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  horizontal?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <ScrollView horizontal={horizontal} showsHorizontalScrollIndicator={false}>
        <View className={cn("flex-row flex-wrap gap-2", horizontal && "flex-nowrap")}>
          {options.map((option) => {
            const active = value === option.value;
            return (
              <PressableScale
                key={option.value}
                haptic="selection"
                onPress={() => onChange(option.value)}
              >
                <View
                  className={cn(
                    "min-h-11 justify-center rounded-xl border border-border bg-card px-4 py-2",
                    active && "border-primary bg-primary/10",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium text-muted-foreground",
                      active && "text-primary",
                    )}
                  >
                    {option.label}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
