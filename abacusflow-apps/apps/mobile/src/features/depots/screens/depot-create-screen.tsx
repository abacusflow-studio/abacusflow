import { depotApi } from "@abacusflow/core";
import { FormScreen } from "@components/layout/form-screen";

export default function DepotCreateScreen() {
  return (
    <FormScreen
      title="新增存储点"
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
      onSubmit={async (values) => {
        await depotApi.addDepot({
          createDepotInput: {
            name: values.name as string,
            location: (values.location as string)?.trim() || undefined,
            capacity: values.capacity as number | undefined,
          },
        });
      }}
      submitLabel="创建存储点"
    />
  );
}
