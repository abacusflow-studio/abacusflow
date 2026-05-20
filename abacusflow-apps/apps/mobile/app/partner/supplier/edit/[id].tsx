import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supplierApi, type Supplier } from "@abacusflow/core";
import { FormScreen } from "@/components/form-screen";

export default function EditSupplierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await supplierApi.getSupplier(Number(id));
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
        <Text>供应商不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑供应商"
      fields={[
        { key: "name", label: "供应商名称", type: "text", placeholder: "请输入供应商名称", required: true },
        { key: "contactPerson", label: "联系人", type: "text", placeholder: "请输入联系人" },
        { key: "phone", label: "电话", type: "text", placeholder: "请输入电话号码" },
        { key: "email", label: "邮箱", type: "text", placeholder: "请输入邮箱" },
        { key: "address", label: "地址", type: "text", placeholder: "请输入地址" },
      ]}
      initialValues={{
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
      }}
      onSubmit={async (values) => {
        await supplierApi.updateSupplier({
          id: Number(id),
          name: values.name as string,
          contactPerson: values.contactPerson as string | undefined,
          phone: values.phone as string | undefined,
          email: values.email as string | undefined,
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
