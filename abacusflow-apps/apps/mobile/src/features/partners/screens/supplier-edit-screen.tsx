import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { partnerApi, type Supplier } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";
import { FormScreen } from "@components/layout/form-screen";

export default function SupplierEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await partnerApi.getSupplier({ id: Number(id) });
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
        <Text>供应商不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑供应商"
      fields={[
        {
          key: "name",
          label: "供应商名称",
          type: "text",
          placeholder: "请输入供应商名称",
          required: true,
        },
        {
          key: "contactPerson",
          label: "联系人",
          type: "text",
          placeholder: "请输入联系人",
        },
        {
          key: "phone",
          label: "电话",
          type: "text",
          placeholder: "请输入电话号码",
        },
        {
          key: "email",
          label: "邮箱",
          type: "text",
          placeholder: "请输入邮箱",
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
        contactPerson: data.contactPerson ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        address: data.address ?? undefined,
      }}
      onSubmit={async (values) => {
        await partnerApi.updateSupplier({
          id: Number(id),
          updateSupplierInput: {
            name: values.name as string,
            contactPerson:
              (values.contactPerson as string)?.trim() || undefined,
            phone: (values.phone as string)?.trim() || undefined,
            email: (values.email as string)?.trim() || undefined,
            address: (values.address as string)?.trim() || undefined,
          },
        });
      }}
      submitLabel="保存修改"
    />
  );
}
