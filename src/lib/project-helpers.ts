import { FISCAL_YEARS, type FiscalYear, type ProjectData, type ProjectYearRecord } from "@/types/project";

/** ProjectData.years を年度の正しい順序(R4→R5→R6→R7→R8)に並べ替える。欠損年度は詰めて並ぶ。 */
export function sortedYears(data: ProjectData): ProjectYearRecord[] {
  return [...data.years].sort(
    (a, b) => FISCAL_YEARS.indexOf(a.year) - FISCAL_YEARS.indexOf(b.year)
  );
}

/** データが存在する最新年度のレコード。 */
export function latestYearRecord(data: ProjectData): ProjectYearRecord | null {
  const years = sortedYears(data);
  return years.length > 0 ? years[years.length - 1] : null;
}

export function findYearRecord(data: ProjectData, year: FiscalYear): ProjectYearRecord | null {
  return data.years.find((y) => y.year === year) ?? null;
}

/**
 * 指定年度の「実データ上の前年度」レコードを返す(暦年ではなく、記録が存在する直前のもの)。
 * R5のように資料が一切無い年度はスキップされる(推測で埋めない)。
 */
export function previousYearRecord(data: ProjectData, year: FiscalYear): ProjectYearRecord | null {
  const years = sortedYears(data);
  const idx = years.findIndex((y) => y.year === year);
  if (idx <= 0) return null;
  return years[idx - 1];
}

/**
 * 決算額が実際に判明している最新年度。未来年度(予算のみ)は対象外。
 * settlementオブジェクトが存在しても決算額がnullなら「決算なし」として扱う
 * (中身が空のまま決算モードを表示してしまわないようにするため)。
 */
export function latestYearWithSettlement(data: ProjectData): ProjectYearRecord | null {
  const years = sortedYears(data).filter((y) => y.settlement?.amount.value != null);
  return years.length > 0 ? years[years.length - 1] : null;
}

/**
 * 原典に記載があればその値を、無ければ出典のある予算額・決算額から計算した値を返す。
 * computed=true の場合は「本システムによる計算値」であることを画面に明示すること
 * (原典に無い数字を、原典にあるかのように見せないため)。
 */
export interface DerivedFigure {
  value: number | null;
  computed: boolean;
}

export function resolveUnspent(record: ProjectYearRecord): DerivedFigure {
  const stated = record.settlement?.unspent.value ?? null;
  if (stated !== null) return { value: stated, computed: false };

  const budgetFinal = record.budget?.final.value ?? null;
  const settled = record.settlement?.amount.value ?? null;
  if (budgetFinal === null || settled === null) return { value: null, computed: false };
  return { value: budgetFinal - settled, computed: true };
}

export function resolveExecutionRate(record: ProjectYearRecord): DerivedFigure {
  const stated = record.settlement?.executionRate.value ?? null;
  if (stated !== null) return { value: stated, computed: false };

  const budgetFinal = record.budget?.final.value ?? null;
  const settled = record.settlement?.amount.value ?? null;
  if (budgetFinal === null || budgetFinal === 0 || settled === null) {
    return { value: null, computed: false };
  }
  return { value: (settled / budgetFinal) * 100, computed: true };
}
