export function formatNumber(num?: number): string {
  if (num === undefined || num === null) {
    return "";
  }
  return num.toLocaleString("zh-CN");
}
