export type ProductUnit =
  | "item"
  | "piece"
  | "box"
  | "pack"
  | "dozen"
  | "pair"
  | "gram"
  | "kilogram"
  | "liter"
  | "milliliter"
  | "meter"
  | "centimeter"
  | "bottle"
  | "barrel"
  | "bag"
  | "sheet"
  | "roll";

export type ProductType = "material" | "asset";

const UNIT_MAP: Record<ProductUnit, string> = {
  item: "个",
  piece: "件",
  box: "箱",
  pack: "包",
  dozen: "打",
  pair: "对",
  gram: "克",
  kilogram: "千克",
  liter: "升",
  milliliter: "毫升",
  meter: "米",
  centimeter: "厘米",
  bottle: "瓶",
  barrel: "桶",
  bag: "袋",
  sheet: "张",
  roll: "卷",
};

const TYPE_MAP: Record<ProductType, string> = {
  material: "普通产品",
  asset: "资产",
};

export function translateProductUnit(input?: ProductUnit): string {
  if (!input) return "";
  return UNIT_MAP[input] || input;
}

export function translateProductType(input?: ProductType): string {
  if (!input) return "";
  return TYPE_MAP[input] || input;
}
