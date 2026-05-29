"use client";

import React, { useMemo } from "react";
import type { SelectableProductCategory } from "@abacusflow/core";

interface CategoryTreeProps {
  categories: SelectableProductCategory[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
}: CategoryTreeProps) {
  const childrenByParent = useMemo(() => {
    const map = new Map<number | undefined, SelectableProductCategory[]>();
    for (const category of categories) {
      const parentId = category.parentId ?? undefined;
      const list = map.get(parentId) ?? [];
      list.push(category);
      map.set(parentId, list);
    }
    return map;
  }, [categories]);

  const renderNodes = (parentId?: number, depth = 0): React.ReactNode => {
    const nodes = childrenByParent.get(parentId) ?? [];
    return nodes.map((category) => (
      <div key={category.id}>
        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${selectedId === category.id ? "bg-blue-50 text-blue-600 font-semibold" : "hover:bg-gray-50"}`}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          {category.name}
        </button>
        {renderNodes(category.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${selectedId === undefined ? "bg-blue-50 text-blue-600 font-semibold" : "hover:bg-gray-50"}`}
      >
        全部类别
      </button>
      {renderNodes(undefined)}
    </div>
  );
}
