import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { transactionApi, type SaleOrder } from "@abacusflow/core";
import { OrderDetailScreen } from "@/components/order-detail-screen";

export default function SaleOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<SaleOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await transactionApi.getSaleOrder(Number(id));
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

  const extraFields =
    data?.discountFactor != null
      ? [{ label: "折扣", value: String(data.discountFactor) }]
      : undefined;

  return (
    <OrderDetailScreen
      loading={loading}
      data={data}
      emptyMessage="销售单不存在"
      partnerLabel="客户"
      partnerName={data?.customerName ?? "-"}
      extraFields={extraFields}
      onComplete={async () => {
        await transactionApi.completeSaleOrder(Number(id));
        loadData();
      }}
      onCancel={async () => {
        await transactionApi.cancelSaleOrder(Number(id));
        loadData();
      }}
      onReverse={async () => {
        await transactionApi.reverseSaleOrder(Number(id));
        loadData();
      }}
    />
  );
}
