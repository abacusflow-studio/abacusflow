export interface ProductCategoryNode {
  id: number;
  name: string;
  parentId?: number | null;
  parentName?: string | null;
}

export type ProductCategoryRow<T extends ProductCategoryNode> = T & {
  depth: number;
};

export const TOP_LEVEL_PARENT_VALUE = "top-level" as const;

export function flattenProductCategories<T extends ProductCategoryNode>(
  categories: readonly T[],
): ProductCategoryRow<T>[] {
  const childrenByParent = new Map<number | undefined, T[]>();
  for (const category of categories) {
    const parentId = category.parentId ?? undefined;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(category);
    childrenByParent.set(parentId, children);
  }

  const result: ProductCategoryRow<T>[] = [];
  const visit = (parentId: number | undefined, depth: number) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      result.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  };

  visit(undefined, 0);
  return result;
}

export function createParentIdFromForm(
  value: number | typeof TOP_LEVEL_PARENT_VALUE | null | undefined,
): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function updateParentIdFromForm(
  value: number | typeof TOP_LEVEL_PARENT_VALUE | null | undefined,
): number | null {
  return typeof value === "number" ? value : null;
}
