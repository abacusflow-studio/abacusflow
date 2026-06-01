import type { BasicDepot } from "@abacusflow/core";

/** 仓库列表项（直接使用 core 类型） */
export type DepotListItem = BasicDepot;

/** 仓库详情（直接使用 core 类型） */
export type DepotDetail = BasicDepot;

/** 仓库表单数据 */
export interface DepotFormData {
  name: string;
  location?: string;
  capacity?: number;
  enabled?: boolean;
}
