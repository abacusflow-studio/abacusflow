import { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { depotApi, type Depot } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { DetailScreen } from "@components/layout/detail-screen";

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
      emptyMessage="储存点不存在"
      title={(d) => d.name}
      badge={(d) => ({
        text: d.enabled ? "启用" : "禁用",
        color: d.enabled ? COLORS.success : COLORS.danger,
        bgColor: d.enabled ? "#f6ffed" : "#fff1f0",
      })}
      fields={(d) => [
        { label: "地址", value: d.location },
        {
          label: "容量",
          value: d.capacity != null ? String(d.capacity) : undefined,
        },
      ]}
      onEdit={() => router.push(`/depot/edit/${id}` as any)}
      onDelete={async () => {
        await depotApi.deleteDepot({ id: Number(id) });
        router.back();
      }}
    />
  );
}
