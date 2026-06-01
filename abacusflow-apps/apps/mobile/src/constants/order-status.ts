import { COLORS } from "@abacusflow/utils";

/** 订单状态配置（lookup 和 records 共用） */
export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  completed: {
    label: "已完成",
    bg: COLORS.successLight,
    color: COLORS.success,
  },
  pending: { label: "待处理", bg: COLORS.warningLight, color: COLORS.warning },
  canceled: { label: "已取消", bg: COLORS.bg, color: COLORS.textTertiary },
  reversed: { label: "已冲销", bg: COLORS.dangerLight, color: COLORS.danger },
};

/** 订单类型配置 */
export const ORDER_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  purchase: { label: "入库", color: COLORS.primary, bg: COLORS.primaryLight },
  sale: { label: "出库", color: COLORS.success, bg: COLORS.successLight },
};
