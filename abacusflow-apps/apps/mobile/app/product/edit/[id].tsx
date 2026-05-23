import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { productApi, type Product } from "@abacusflow/core";
import { PRODUCT_UNITS, PRODUCT_TYPES } from "@abacusflow/utils";
import { FormScreen } from "@abacusflow/ui-native";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productApi.getProduct(Number(id));
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>产品不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑产品"
      fields={[
        {
          key: "name",
          label: "产品名称",
          type: "text",
          placeholder: "请输入产品名称",
          required: true,
        },
        {
          key: "specification",
          label: "规格",
          type: "text",
          placeholder: "请输入规格",
        },
        {
          key: "type",
          label: "产品类型",
          type: "select",
          required: true,
          options: PRODUCT_TYPES.map((t) => ({
            label: t.label,
            value: t.value,
          })),
        },
        {
          key: "categoryId",
          label: "类别ID",
          type: "number",
          placeholder: "请输入类别ID",
        },
        {
          key: "barcode",
          label: "条码",
          type: "text",
          placeholder: "请输入条码",
        },
        {
          key: "unit",
          label: "单位",
          type: "select",
          required: true,
          options: PRODUCT_UNITS.map((u) => ({
            label: u.label,
            value: u.value,
          })),
        },
        {
          key: "note",
          label: "备注",
          type: "textarea",
          placeholder: "请输入备注",
        },
        { key: "enabled", label: "启用状态", type: "switch" },
      ]}
      initialValues={{
        name: data.name,
        specification: data.specification,
        type: data.type,
        categoryId: data.categoryId,
        barcode: data.barcode,
        unit: data.unit,
        note: data.note,
        enabled: data.enabled,
      }}
      onSubmit={async (values) => {
        await productApi.updateProduct({
          id: Number(id),
          name: values.name as string,
          specification: values.specification as string | undefined,
          type: values.type as any,
          categoryId: values.categoryId as number | undefined,
          barcode: values.barcode as string | undefined,
          unit: values.unit as any,
          note: values.note as string | undefined,
          enabled: values.enabled as boolean,
        });
      }}
      submitLabel="保存修改"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
