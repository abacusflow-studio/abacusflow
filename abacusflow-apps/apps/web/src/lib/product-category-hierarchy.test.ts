import assert from "node:assert/strict";
import test from "node:test";
import {
  createParentIdFromForm,
  flattenProductCategories,
  TOP_LEVEL_PARENT_VALUE,
  updateParentIdFromForm,
  type ProductCategoryNode,
} from "./product-category-hierarchy.ts";

test("an empty catalog produces no real category rows", () => {
  assert.deepEqual(flattenProductCategories([]), []);
});

test("multiple categories without parents remain independent top-level rows", () => {
  const rows = flattenProductCategories([
    category(1, "食品", null),
    category(2, "日用品", null),
  ]);

  assert.deepEqual(
    rows.map(({ id, depth }) => ({ id, depth })),
    [
      { id: 1, depth: 0 },
      { id: 2, depth: 0 },
    ],
  );
});

test("nested real categories are flattened beneath their own top-level branch", () => {
  const rows = flattenProductCategories([
    category(1, "食品", null),
    category(2, "饮料", 1),
    category(3, "茶", 2),
    category(4, "日用品", null),
  ]);

  assert.deepEqual(
    rows.map(({ name, depth }) => ({ name, depth })),
    [
      { name: "食品", depth: 0 },
      { name: "饮料", depth: 1 },
      { name: "茶", depth: 2 },
      { name: "日用品", depth: 0 },
    ],
  );
});

test("creating from the virtual root omits a fabricated parent ID", () => {
  assert.equal(createParentIdFromForm(undefined), undefined);
  assert.equal(createParentIdFromForm(null), undefined);
  assert.equal(createParentIdFromForm(TOP_LEVEL_PARENT_VALUE), undefined);
  assert.equal(createParentIdFromForm(42), 42);
});

test("moving to the top level sends an explicit null parent", () => {
  assert.equal(updateParentIdFromForm(TOP_LEVEL_PARENT_VALUE), null);
  assert.equal(updateParentIdFromForm(null), null);
  assert.equal(updateParentIdFromForm(42), 42);
});

test("a real category named 根节点 is treated like any other category", () => {
  const rows = flattenProductCategories([
    category(7, "根节点", null),
    category(8, "普通子分类", 7),
  ]);

  assert.deepEqual(
    rows.map(({ id, name, depth }) => ({ id, name, depth })),
    [
      { id: 7, name: "根节点", depth: 0 },
      { id: 8, name: "普通子分类", depth: 1 },
    ],
  );
});

function category(
  id: number,
  name: string,
  parentId: number | null,
): ProductCategoryNode {
  return { id, name, parentId };
}
