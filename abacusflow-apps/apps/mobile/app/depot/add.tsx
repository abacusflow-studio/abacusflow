import { depotApi } from "@abacusflow/core";
import { FormScreen } from "@/components/form-screen";

export default function AddDepotScreen() {
  return (
    <FormScreen
      title="新增储存点"
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
      ]}
      onSubmit={async (values) => {
        await depotApi.createDepot({
          name: values.name as string,
          location: values.location as string | undefined,
          capacity: values.capacity as number | undefined,
        });
      }}
      submitLabel="创建储存点"
    />
  );
}
