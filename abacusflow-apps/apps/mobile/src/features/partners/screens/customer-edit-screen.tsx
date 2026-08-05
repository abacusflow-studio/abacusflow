import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { partnerApi, type Customer } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";
import { FormScreen } from "@components/layout/form-screen";

export default function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await partnerApi.getCustomer({ id: Number(id) });
        if (active) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={THEME.light.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>客户不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑客户"
      fields={[
        {
          key: "name",
          label: "客户名称",
          type: "text",
          placeholder: "请输入客户名称",
          required: true,
        },
        {
          key: "phone",
          label: "电话",
          type: "text",
          placeholder: "请输入电话号码",
        },
        {
          key: "address",
          label: "地址",
          type: "text",
          placeholder: "请输入地址",
        },
      ]}
      initialValues={{
        name: data.name,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
      }}
      onSubmit={async (values) => {
        await partnerApi.updateCustomer({
          id: Number(id),
          updateCustomerInput: {
            name: values.name as string,
            phone: (values.phone as string)?.trim() || undefined,
            address: (values.address as string)?.trim() || undefined,
          },
        });
      }}
      submitLabel="保存修改"
    />
  );
}
