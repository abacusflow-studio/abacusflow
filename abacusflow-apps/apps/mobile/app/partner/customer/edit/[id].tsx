import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { customerApi, type Customer } from "@abacusflow/core";
import { FormScreen } from "@/components/form-screen";

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
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
        phone: data.phone,
        address: data.address,
      }}
      onSubmit={async (values) => {
        await customerApi.updateCustomer({
          id: Number(id),
          name: values.name as string,
          phone: values.phone as string | undefined,
          address: values.address as string | undefined,
        });
      }}
      submitLabel="保存修改"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
