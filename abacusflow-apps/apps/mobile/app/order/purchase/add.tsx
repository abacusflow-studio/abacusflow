import { partnerApi, productApi, transactionApi } from "@abacusflow/core";
import { OrderFormScreen } from "@abacusflow/ui-native";

export default function AddPurchaseOrderScreen() {
  return (
    <OrderFormScreen
      orderType="purchase"
      partnerLabel="供应商"
      loadPartners={async () => {
        return partnerApi.listSelectableSuppliers();
      }}
      itemLabel="产品"
      loadItems={async () => {
        const products = await productApi.listSelectableProducts();
        return products.map((product) => ({
          id: product.id,
          label: product.name,
          detail: product.barcode,
        }));
      }}
      buildSubmitData={async ({ partnerId, orderDate, items }) => {
        await transactionApi.addPurchaseOrder({
          createPurchaseOrderInput: {
            supplierId: partnerId,
            orderDate,
            orderItems: items.map((item) => ({
              productId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        });
      }}
    />
  );
}
