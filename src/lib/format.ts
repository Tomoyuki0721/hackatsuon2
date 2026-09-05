// 表示専用のフォーマッタ。内部値は常に円(整数)を丸めずに保持し、表示時にのみ変換する。

export function formatYen(value: number | null | undefined): string {
  if (value === null || value === undefined) return "資料記載なし";
  const abs = Math.abs(value);
  if (abs >= 100000000) {
    return `${(value / 100000000).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}億円`;
  }
  if (abs >= 10000) {
    return `${(value / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
  }
  if (abs >= 1000) {
    return `${(value / 1000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}千円`;
  }
  return `${value.toLocaleString("ja-JP")}円`;
}

export function formatYenExact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "資料記載なし";
  return `${value.toLocaleString("ja-JP")}円`;
}

/** 増減率(%)。前年値が0または欠損なら算出不可を意味するnullを返す。丸めは表示直前のみ。 */
export function growthRate(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "算出不可";
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "算出不可";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** 執行率 = 決算額 / 予算現額 * 100 */
export function executionRate(
  settlementAmount: number | null | undefined,
  budgetFinal: number | null | undefined
): number | null {
  if (settlementAmount === null || settlementAmount === undefined) return null;
  if (budgetFinal === null || budgetFinal === undefined || budgetFinal === 0) return null;
  return (settlementAmount / budgetFinal) * 100;
}

/** 不用額 = 予算現額 - 決算額 */
export function unspentAmount(
  budgetFinal: number | null | undefined,
  settlementAmount: number | null | undefined
): number | null {
  if (budgetFinal === null || budgetFinal === undefined) return null;
  if (settlementAmount === null || settlementAmount === undefined) return null;
  return budgetFinal - settlementAmount;
}

/** 単価計算(1件・1人当たり費用等)。分母が0/欠損なら算出不可。 */
export function unitCost(
  amount: number | null | undefined,
  count: number | null | undefined
): number | null {
  if (amount === null || amount === undefined) return null;
  if (count === null || count === undefined || count === 0) return null;
  return amount / count;
}
