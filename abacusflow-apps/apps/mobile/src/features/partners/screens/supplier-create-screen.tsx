import { partnerApi } from "@abacusflow/core";
import { FormScreen } from "@components/layout/form-screen";

export default function SupplierCreateScreen() {
  return (
    <FormScreen
      title="新增供应商"
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
      onSubmit={async (values) => {
        await partnerApi.addSupplier({
          createSupplierInput: {
            name: values.name as string,
            contactPerson:
              (values.contactPerson as string)?.trim() || undefined,
            phone: (values.phone as string)?.trim() || undefined,
            email: (values.email as string)?.trim() || undefined,
            address: (values.address as string)?.trim() || undefined,
          },
        });
      }}
      submitLabel="创建供应商"
    />
  );
}
