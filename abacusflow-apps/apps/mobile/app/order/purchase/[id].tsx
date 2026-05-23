import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { transactionApi, type PurchaseOrder } from "@abacusflow/core";
import { OrderDetailScreen } from "@abacusflow/ui-native";

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await transactionApi.getPurchaseOrder(Number(id));
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
      partnerName={data?.supplierName ?? "-"}
      onComplete={async () => {
        await transactionApi.completePurchaseOrder(Number(id));
        loadData();
      }}
      onCancel={async () => {
        await transactionApi.cancelPurchaseOrder(Number(id));
        loadData();
      }}
      onReverse={async () => {
        await transactionApi.reversePurchaseOrder(Number(id));
        loadData();
      }}
    />
  );
}
