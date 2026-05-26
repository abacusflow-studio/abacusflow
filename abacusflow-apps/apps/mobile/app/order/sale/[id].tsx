import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { transactionApi, type SaleOrder } from "@abacusflow/core";
import { OrderDetailScreen } from "@abacusflow/ui-native";

export default function SaleOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<SaleOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await transactionApi.getSaleOrder({ id: Number(id) });
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
    <OrderDetailScreen
      loading={loading}
      data={data}
      emptyMessage="销售单不存在"
      partnerLabel="客户"
      partnerName={data ? `客户#${data.customerId}` : "-"}
      onComplete={async () => {
        await transactionApi.completeSaleOrder({ id: Number(id) });
        loadData();
      }}
      onCancel={async () => {
        await transactionApi.cancelSaleOrder({ id: Number(id) });
        loadData();
      }}
      onReverse={async () => {
        await transactionApi.reverseSaleOrder({ id: Number(id) });
        loadData();
      }}
    />
  );
}
