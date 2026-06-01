import { depotApi } from "@abacusflow/core";

/** 获取所有仓库 */
export async function listDepots() {
  return depotApi.listBasicDepots();
}

/** 获取仓库详情 */
export async function getDepot(id: number) {
  return depotApi.getDepot({ id });
}

/** 创建仓库 */
export async function createDepot(input: {
  name: string;
  location?: string;
  capacity?: number;
}) {
  await depotApi.addDepot({ createDepotInput: input });
}

/** 更新仓库 */
export async function updateDepot(
  id: number,
  input: {
    name: string;
    location?: string;
    capacity?: number;
    enabled?: boolean;
  },
) {
  await depotApi.updateDepot({ id, updateDepotInput: input });
}

/** 删除仓库 */
export async function deleteDepot(id: number) {
  await depotApi.deleteDepot({ id });
}
