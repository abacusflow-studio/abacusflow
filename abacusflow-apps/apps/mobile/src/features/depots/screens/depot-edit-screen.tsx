import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { depotApi, type Depot } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";
import { FormScreen } from "@components/layout/form-screen";

export default function DepotEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDepot() {
      try {
        const res = await depotApi.getDepot({ id: Number(id) });
        if (active) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDepot();
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
        <Text>存储点不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑存储点"
      fields={[
        {
          key: "name",
          label: "存储点名称",
          type: "text",
          placeholder: "请输入名称",
          required: true,
        },
        {
          key: "location",
          label: "地址",
          type: "text",
          placeholder: "请输入地址",
        },
        {
          key: "capacity",
          label: "容量",
          type: "number",
          placeholder: "请输入容量",
        },
      ]}
      initialValues={{
        name: data.name,
        location: data.location ?? undefined,
        capacity: data.capacity ?? undefined,
      }}
      onSubmit={async (values) => {
        await depotApi.updateDepot({
          id: Number(id),
          updateDepotInput: {
            name: values.name as string,
            location: (values.location as string)?.trim() || undefined,
            capacity: values.capacity as number | undefined,
          },
        });
      }}
      submitLabel="保存修改"
    />
  );
}
