import { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { productApi, type Product } from "@abacusflow/core";
import {
  translateProductType,
  translateProductUnit,
  COLORS,
} from "@abacusflow/utils";
import { DetailScreen } from "@abacusflow/ui-native";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await productApi.getProduct({ id: Number(id) });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DetailScreen
      loading={loading}
      data={data}
      emptyMessage="产品不存在"
      title={(d) => d.name}
      badge={(d) => ({
        text: d.enabled ? "启用" : "禁用",
        color: d.enabled ? COLORS.success : COLORS.danger,
        bgColor: d.enabled ? "#f6ffed" : "#fff1f0",
      })}
      fields={(d) => [
        { label: "类型", value: translateProductType(d.type) },
        { label: "单位", value: translateProductUnit(d.unit) },
        { label: "类别ID", value: d.categoryId },
        { label: "规格", value: d.specification },
        { label: "条码", value: d.barcode },
        { label: "备注", value: d.note },
        { label: "创建时间", value: d.createdAt },
      ]}
      onEdit={() => router.push(`/product/edit/${id}` as any)}
      onDelete={async () => {
        await productApi.deleteProduct({ id: Number(id) });
        router.back();
      }}
    />
  );
}
