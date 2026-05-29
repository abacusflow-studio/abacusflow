import { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { depotApi, type Depot } from "@abacusflow/core";
import { FormScreen } from "@/components/ui";

export default function EditDepotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDepot = useCallback(async () => {
    try {
      const res = await depotApi.getDepot({ id: Number(id) });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDepot();
  }, [loadDepot]);

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
        <Text>储存点不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑储存点"
      fields={[
        {
          key: "name",
          label: "储存点名称",
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
        { key: "enabled", label: "启用状态", type: "switch" },
      ]}
      initialValues={{
        name: data.name,
        location: data.location ?? undefined,
        capacity: data.capacity ?? undefined,
        enabled: data.enabled,
      }}
      onSubmit={async (values) => {
        await depotApi.updateDepot({
          id: Number(id),
          updateDepotInput: {
            name: values.name as string,
            location: values.location as string | undefined,
            capacity: values.capacity as number | undefined,
          },
        });
      }}
      submitLabel="保存修改"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
