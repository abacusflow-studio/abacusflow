import dayjs from "dayjs";

export function timestampToLocaleString(timestamp?: number): string {
  if (timestamp === undefined || timestamp === null) {
    return "";
  }
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN");
}

export function dateToFormattedString(
  date?: Date | string | null,
  format = "YYYY-MM-DD",
): string {
  if (!date) return "";
  return dayjs(date).format(format);
}

export function isWithinDays(date: string | Date, days: number): boolean {
  return dayjs().diff(dayjs(date), "day") <= days;
}
