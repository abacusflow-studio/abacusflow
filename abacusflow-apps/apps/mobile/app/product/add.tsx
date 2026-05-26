import { productApi } from "@abacusflow/core";
import { PRODUCT_UNITS, PRODUCT_TYPES } from "@abacusflow/utils";
import { FormScreen } from "@abacusflow/ui-native";

export default function AddProductScreen() {
  return (
    <FormScreen
      title="新增产品"
      fields={[
        {
          key: "name",
          label: "产品名称",
          type: "text",
          placeholder: "请输入产品名称",
          required: true,
        },
        {
          key: "specification",
          label: "规格",
          type: "text",
          placeholder: "请输入规格",
        },
        {
          key: "type",
          label: "产品类型",
          type: "select",
          required: true,
          options: PRODUCT_TYPES.map((t) => ({
            label: t.label,
            value: t.value,
          })),
        },
        {
          key: "categoryId",
          label: "类别ID",
          type: "number",
          placeholder: "请输入类别ID",
        },
        {
          key: "barcode",
          label: "条码",
          type: "text",
          placeholder: "请输入条码",
        },
        {
          key: "unit",
          label: "单位",
          type: "select",
          required: true,
          options: PRODUCT_UNITS.map((u) => ({
            label: u.label,
            value: u.value,
          })),
        },
        {
          key: "note",
          label: "备注",
          type: "textarea",
          placeholder: "请输入备注",
        },
      ]}
      onSubmit={async (values) => {
        await productApi.addProduct({
          createProductInput: {
            name: values.name as string,
            specification: values.specification as string | undefined,
            type: values.type as any,
            categoryId: values.categoryId as number,
            barcode: values.barcode as string,
            unit: values.unit as any,
            note: values.note as string | undefined,
          },
        });
      }}
      submitLabel="创建产品"
    />
  );
}
