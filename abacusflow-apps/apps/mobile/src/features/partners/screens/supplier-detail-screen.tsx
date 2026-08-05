import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { partnerApi, type Supplier } from "@abacusflow/core";
import { DetailScreen } from "@components/layout/detail-screen";

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await partnerApi.getSupplier({ id: Number(id) });
        if (active) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <DetailScreen
      loading={loading}
      data={data}
      emptyMessage="供应商不存在"
      title={(d) => d.name}
      fields={(d) => [
        { label: "联系人", value: d.contactPerson },
        { label: "电话", value: d.phone },
        { label: "邮箱", value: d.email },
        { label: "地址", value: d.address },
        { label: "创建时间", value: d.createdAt },
      ]}
      onEdit={() => router.push(`/partner/supplier/edit/${id}` as any)}
      onDelete={async () => {
        await partnerApi.deleteSupplier({ id: Number(id) });
        router.back();
      }}
    />
  );
}
