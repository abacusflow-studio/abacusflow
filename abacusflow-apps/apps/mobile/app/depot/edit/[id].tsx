import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { depotApi, type Depot } from "@abacusflow/core";
import { FormScreen } from "@/components/form-screen";

export default function EditDepotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDepot();
  }, [id]);

  const loadDepot = async () => {
    try {
      const res = await depotApi.getDepot(Number(id));
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
        <Text>储存点不存在</Text>
      </View>
    );
  }

  return (
    <FormScreen
      title="编辑储存点"
      fields={[
        { key: "name", label: "储存点名称", type: "text", placeholder: "请输入名称", required: true },
        { key: "location", label: "地址", type: "text", placeholder: "请输入地址" },
        { key: "capacity", label: "容量", type: "number", placeholder: "请输入容量" },
        { key: "enabled", label: "启用状态", type: "switch" },
      ]}
      initialValues={{
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        enabled: data.enabled,
      }}
      onSubmit={async (values) => {
        await depotApi.updateDepot({
          id: Number(id),
          name: values.name as string,
          location: values.location as string | undefined,
          capacity: values.capacity as number | undefined,
          enabled: values.enabled as boolean,
        });
      }}
      submitLabel="保存修改"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
