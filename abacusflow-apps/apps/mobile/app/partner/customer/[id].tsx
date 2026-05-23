import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { customerApi, type Customer } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { DetailScreen } from "@/components/detail-screen";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await customerApi.getCustomer(Number(id));
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
      emptyMessage="客户不存在"
      title={(d) => d.name}
      fields={(d) => [
        { label: "电话", value: d.phone },
        { label: "地址", value: d.address },
        {
          label: "历史订单数",
          value: d.totalOrders != null ? String(d.totalOrders) : undefined,
        },
        {
          label: "历史总金额",
          value:
            d.totalAmount != null
              ? `¥${d.totalAmount.toLocaleString("zh-CN")}`
              : undefined,
        },
      ]}
      onEdit={() => router.push(`/partner/customer/edit/${id}` as any)}
      onDelete={async () => {
        await customerApi.deleteCustomer(Number(id));
        router.back();
      }}
    />
  );
}
