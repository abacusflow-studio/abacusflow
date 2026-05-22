import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supplierApi, type Supplier } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { DetailScreen } from "@/components/detail-screen";

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await supplierApi.getSupplier(Number(id));
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        { label: "历史订单数", value: d.totalOrders != null ? String(d.totalOrders) : undefined },
        { label: "历史总金额", value: d.totalAmount != null ? `¥${d.totalAmount.toLocaleString("zh-CN")}` : undefined },
      ]}
      onEdit={() => router.push(`/partner/supplier/edit/${id}` as any)}
      onDelete={async () => {
        await supplierApi.deleteSupplier(Number(id));
        router.back();
      }}
    />
  );
}
