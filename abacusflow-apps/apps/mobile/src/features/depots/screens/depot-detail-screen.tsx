import { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { depotApi, type Depot } from "@abacusflow/core";
import { DetailScreen } from "@components/layout/detail-screen";

const formatDateTime = (value?: number) => {
  if (!value) return undefined;
  return new Date(value).toLocaleString("zh-CN");
};

export default function DepotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await depotApi.getDepot({ id: Number(id) });
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
      emptyMessage="存储点不存在"
      title={(d) => d.name}
      fields={(d) => [
        { label: "地址", value: d.location },
        {
          label: "容量",
          value: d.capacity != null ? String(d.capacity) : undefined,
        },
        { label: "状态", value: d.enabled ? "启用" : "禁用" },
        { label: "创建时间", value: formatDateTime(d.createdAt) },
      ]}
      onEdit={() => router.push(`/depot/edit/${id}` as any)}
      onDelete={async () => {
        await depotApi.deleteDepot({ id: Number(id) });
        router.back();
      }}
    />
  );
}
