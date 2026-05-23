import { partnerApi, productApi, transactionApi } from "@abacusflow/core";
import { OrderFormScreen } from "@abacusflow/ui-native";

export default function AddPurchaseOrderScreen() {
  return (
    <OrderFormScreen
      orderType="purchase"
      partnerLabel="供应商"
      loadPartners={async () => {
        const res = await partnerApi.listBasicSuppliersPage({
          pageIndex: 1,
          pageSize: 100,
        });
        return res.content;
      }}
      loadProducts={async () => {
        const res = await productApi.listBasicProductsPage({
          pageIndex: 1,
          pageSize: 100,
        });
        return res.content;
      }}
      buildSubmitData={async ({ partnerId, orderDate, items }) => {
        await transactionApi.createPurchaseOrder({
          supplierId: partnerId,
          orderDate,
          items,
        });
      }}
    />
  );
}
