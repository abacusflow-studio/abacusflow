import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { transactionApi, type PurchaseOrder } from "@abacusflow/core";
import { OrderDetailScreen } from "@/components/ui";

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await transactionApi.getPurchaseOrder({ id: Number(id) });
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
      emptyMessage="采购单不存在"
      partnerLabel="供应商"
      partnerName={data ? `供应商#${data.supplierId}` : "-"}
      onComplete={async () => {
        await transactionApi.completePurchaseOrder({ id: Number(id) });
        loadData();
      }}
      onCancel={async () => {
        await transactionApi.cancelPurchaseOrder({ id: Number(id) });
        loadData();
      }}
      onReverse={async () => {
        await transactionApi.reversePurchaseOrder({ id: Number(id) });
        loadData();
      }}
    />
  );
}
