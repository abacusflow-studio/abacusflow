import { useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import { inventoryApi, partnerApi, transactionApi } from "@abacusflow/core";
import { COLORS, translateInventoryUnitType } from "@abacusflow/utils";
import { OrderFormScreen } from "@abacusflow/ui-native";

export default function AddSaleOrderScreen() {
  const [discountFactor, setDiscountFactor] = useState("");

  return (
    <OrderFormScreen
      orderType="sale"
      partnerLabel="客户"
      accentColor="#722ed1"
      loadPartners={async () => {
        return partnerApi.listSelectableCustomers();
      }}
      itemLabel="库存单元"
      loadItems={async () => {
        const units = await inventoryApi.listSelectableInventoryUnits({
          statuses: ["normal", "reversed"],
        });
        return units.map((unit) => ({
          id: unit.id,
          label: unit.title,
          detail: translateInventoryUnitType(unit.type),
        }));
      }}
      extraFields={
        <>
          <Text style={styles.label}>折扣系数</Text>
          <TextInput
            style={styles.input}
            value={discountFactor}
            onChangeText={setDiscountFactor}
            keyboardType="numeric"
            placeholder="例如: 0.9 表示九折"
          />
        </>
      }
      buildSubmitData={async ({ partnerId, orderDate, items }) => {
        const discount = discountFactor ? Number(discountFactor) : 1;
        if (Number.isNaN(discount) || discount <= 0 || discount > 1) {
          throw new Error("折扣系数需大于 0 且不超过 1");
        }

        await transactionApi.addSaleOrder({
          createSaleOrderInput: {
            customerId: partnerId,
            orderDate,
            orderItems: items.map((item) => ({
              inventoryUnitId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountFactor: discount,
            })),
          },
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
});
