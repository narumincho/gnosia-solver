/**
 * 整数を 3 桁ごとにスペースで区切って表示する (例: 908107200 → "908 107 200")
 */
export function formatWithSpaces(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.trunc(Math.abs(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
