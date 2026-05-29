import { partnerApi } from "@abacusflow/core";
import { FormScreen } from "@/components/ui";

export default function AddCustomerScreen() {
  return (
    <FormScreen
      title="新增客户"
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
      onSubmit={async (values) => {
        await partnerApi.addCustomer({
          createCustomerInput: {
            name: values.name as string,
            phone: values.phone as string | undefined,
            address: values.address as string | undefined,
          },
        });
      }}
      submitLabel="创建客户"
    />
  );
}
