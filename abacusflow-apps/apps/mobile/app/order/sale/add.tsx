import { useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import { customerApi, productApi, transactionApi } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { OrderFormScreen } from "@/components/order-form-screen";

export default function AddSaleOrderScreen() {
  const [discountFactor, setDiscountFactor] = useState("");

  return (
    <OrderFormScreen
      orderType="sale"
      partnerLabel="客户"
      accentColor="#722ed1"
      loadPartners={async () => {
        const res = await customerApi.listCustomersPage({ pageIndex: 1, pageSize: 100 });
        return res.content;
      }}
      loadProducts={async () => {
        const res = await productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 100 });
        return res.content;
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
        await transactionApi.createSaleOrder({
          customerId: partnerId,
          orderDate,
          discountFactor: discountFactor ? Number(discountFactor) : undefined,
          items,
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8, marginTop: 16 },
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
