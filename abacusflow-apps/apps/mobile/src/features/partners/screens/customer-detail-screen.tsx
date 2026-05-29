import { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { partnerApi, type Customer } from "@abacusflow/core";
import { DetailScreen } from "@components/layout/detail-screen";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await partnerApi.getCustomer({ id: Number(id) });
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
      emptyMessage="客户不存在"
      title={(d) => d.name}
      fields={(d) => [
        { label: "电话", value: d.phone },
        { label: "地址", value: d.address },
        { label: "创建时间", value: d.createdAt },
      ]}
      onEdit={() => router.push(`/partner/customer/edit/${id}` as any)}
      onDelete={async () => {
        await partnerApi.deleteCustomer({ id: Number(id) });
        router.back();
      }}
    />
  );
}
