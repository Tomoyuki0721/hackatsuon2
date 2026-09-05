import type { FiscalYear, ProjectData, ProjectYearRecord } from "@/types/project";
import { growthRate } from "./format";
import {
  latestYearRecord,
  latestYearWithSettlement,
  previousYearRecord,
  resolveExecutionRate,
  sortedYears,
} from "./project-helpers";

/**
 * 横断分析。すべて出典のある数値からの計算のみで構成し、資料に無い事実は作らない。
 * 信頼度「低」のデータは自動抽出(ランキング)の対象から除外する(matching-rules.md §5)。
 */

export type FlagKind =
  | "low-execution"
  | "budget-up-outcome-flat"
  | "efficiency"
  | "general-fund-up"
  | "continuing-issue";

export interface AnalysisFlag {
  kind: FlagKind;
  label: string;
  detail: string;
}

export interface NewInitiativeRef {
  year: FiscalYear;
  name: string;
  label: string;
}

export interface ProjectAnalysis {
  projectId: string;
  name: string;
  department: string;
  section: string;
  policyCategory: string;
  budgetCategory: string;
  /** 「2款」のような款だけを取り出したもの。絞り込み用。 */
  budgetSection: string;
  years: FiscalYear[];
  aliases: string[];
  /** 検索対象にまとめたテキスト(事業名・所管・分野・主な事業内容など) */
  searchText: string;

  latestBudgetYear: FiscalYear | null;
  latestBudget: number | null;
  budgetGrowth: number | null;

  latestSettlementYear: FiscalYear | null;
  latestSettlement: number | null;
  executionRate: number | null;

  generalFundGrowth: number | null;

  outcomeLabel: string | null;
  outcomeLatest: number | null;
  outcomePrevious: number | null;
  outcomeGrowth: number | null;

  newInitiatives: NewInitiativeRef[];
  issueYears: FiscalYear[];
  flags: AnalysisFlag[];
}

/** 予算額。原典に無い場合はnull(推測しない)。当初予算が無ければ最終予算を使う。 */
function budgetOf(record: ProjectYearRecord | null): number | null {
  if (!record?.budget) return null;
  return record.budget.initial.value ?? record.budget.final.value ?? null;
}

/** 信頼度「低」の値は自動抽出の対象にしない。 */
function isReliableBudget(record: ProjectYearRecord | null): boolean {
  if (!record?.budget) return false;
  const field = record.budget.initial.value !== null ? record.budget.initial : record.budget.final;
  return field.confidence !== "低";
}

/** 年度をまたいで同じラベルで追える成果指標(OUTCOME)のうち、最初のものを代表指標とする。 */
function primaryOutcome(years: ProjectYearRecord[]): {
  label: string;
  latest: number | null;
  previous: number | null;
} | null {
  const withOutcome = years.filter((y) => (y.outputOutcome?.outcomes ?? []).length > 0);
  if (withOutcome.length === 0) return null;

  const latestRecord = withOutcome[withOutcome.length - 1];
  const entry = (latestRecord.outputOutcome?.outcomes ?? []).find((m) => m.numericValue != null);
  if (!entry) return null;

  const prevRecord = withOutcome.length >= 2 ? withOutcome[withOutcome.length - 2] : null;
  const prevEntry = prevRecord
    ? (prevRecord.outputOutcome?.outcomes ?? []).find((m) => m.label === entry.label)
    : null;

  return {
    label: entry.label,
    latest: entry.numericValue ?? null,
    previous: prevEntry?.numericValue ?? null,
  };
}

export function analyzeProject(data: ProjectData): ProjectAnalysis {
  const years = sortedYears(data);
  const latestBudgetRecord = latestYearRecord(data);
  const prevOfBudget = latestBudgetRecord ? previousYearRecord(data, latestBudgetRecord.year) : null;
  const latestSettlementRecord = latestYearWithSettlement(data);
  const prevOfSettlement = latestSettlementRecord
    ? previousYearRecord(data, latestSettlementRecord.year)
    : null;

  const budgetReliable = isReliableBudget(latestBudgetRecord) && isReliableBudget(prevOfBudget);
  const budgetGrowth = budgetReliable
    ? growthRate(budgetOf(latestBudgetRecord), budgetOf(prevOfBudget))
    : null;

  const executionRate = latestSettlementRecord ? resolveExecutionRate(latestSettlementRecord).value : null;

  const generalFundGrowth = growthRate(
    latestSettlementRecord?.funding?.generalFund.value ?? null,
    prevOfSettlement?.funding?.generalFund.value ?? null
  );

  const outcome = primaryOutcome(years);
  const outcomeGrowth = outcome ? growthRate(outcome.latest, outcome.previous) : null;

  const newInitiatives: NewInitiativeRef[] = years.flatMap((y) =>
    y.newInitiatives.map((ni) => ({ year: y.year, name: ni.name, label: ni.label }))
  );

  const issueYears = years.filter((y) => y.issuesAndResponse?.issue?.value).map((y) => y.year);

  const flags: AnalysisFlag[] = [];

  if (executionRate !== null && executionRate < 85) {
    flags.push({
      kind: "low-execution",
      label: "執行率が低い",
      detail: `${latestSettlementRecord?.year}年度の執行率は${executionRate.toFixed(1)}%で、85%を下回っています。`,
    });
  }

  const outcomeDetail = outcome ? `${outcome.label}(${outcome.previous} → ${outcome.latest})` : "";

  if (budgetGrowth !== null && budgetGrowth >= 30 && outcomeGrowth !== null && outcomeGrowth <= 3) {
    flags.push({
      kind: "budget-up-outcome-flat",
      label: "予算増に対して成果の伸びが小さい",
      detail: `予算が${budgetGrowth.toFixed(1)}%増える一方、${outcomeDetail}の伸びは${outcomeGrowth.toFixed(1)}%です。指標は代表的な1項目のみで事業全体の成果を表すものではありません。`,
    });
  }

  if (budgetGrowth !== null && budgetGrowth < 0 && outcomeGrowth !== null && outcomeGrowth > 0) {
    flags.push({
      kind: "efficiency",
      label: "効率化の可能性",
      detail: `予算が${budgetGrowth.toFixed(1)}%減る一方、${outcomeDetail}は${outcomeGrowth.toFixed(1)}%伸びています。`,
    });
  }

  if (generalFundGrowth !== null && generalFundGrowth >= 10) {
    flags.push({
      kind: "general-fund-up",
      label: "一般財源負担が増加",
      detail: `${latestSettlementRecord?.year}年度の一般財源が前年度から${generalFundGrowth.toFixed(1)}%増えています。`,
    });
  }

  if (issueYears.length >= 3) {
    flags.push({
      kind: "continuing-issue",
      label: "課題が継続して記載",
      detail: `資料のある${issueYears.join("・")}の各年度で課題が記載されています(記載内容が同一かどうかは各年度の本文をご確認ください)。`,
    });
  }

  const searchText = [
    data.master.canonicalName,
    ...data.master.aliases,
    data.master.department,
    data.master.section,
    data.master.policyCategory,
    data.master.budgetCategory,
    ...years.flatMap((y) => (y.implementation?.mainSubProjects ?? []).map((sp) => sp.value ?? "")),
    ...newInitiatives.map((ni) => ni.name),
  ]
    .join(" ")
    .toLowerCase();

  return {
    projectId: data.master.projectId,
    name: data.master.canonicalName,
    department: data.master.department,
    section: data.master.section,
    policyCategory: data.master.policyCategory,
    budgetCategory: data.master.budgetCategory,
    budgetSection: data.master.budgetCategory.match(/^\d+款/)?.[0] ?? "その他",
    years: years.map((y) => y.year),
    aliases: data.master.aliases,
    searchText,

    latestBudgetYear: latestBudgetRecord?.year ?? null,
    latestBudget: budgetOf(latestBudgetRecord),
    budgetGrowth,

    latestSettlementYear: latestSettlementRecord?.year ?? null,
    latestSettlement: latestSettlementRecord?.settlement?.amount.value ?? null,
    executionRate,

    generalFundGrowth,

    outcomeLabel: outcome?.label ?? null,
    outcomeLatest: outcome?.latest ?? null,
    outcomePrevious: outcome?.previous ?? null,
    outcomeGrowth,

    newInitiatives,
    issueYears,
    flags,
  };
}

export interface Spotlight {
  key: string;
  title: string;
  description: string;
  items: { analysis: ProjectAnalysis; note: string }[];
}

/** トップページの自動抽出。該当が無い場合は空配列を返し、画面側で「該当なし」と明示する。 */
export function buildSpotlights(analyses: ProjectAnalysis[]): Spotlight[] {
  const latestYear = analyses
    .map((a) => a.latestBudgetYear)
    .filter((y): y is FiscalYear => y !== null)
    .sort()
    .pop();

  const newThisYear = analyses
    .map((a) => ({
      analysis: a,
      items: a.newInitiatives.filter((ni) => ni.year === latestYear),
    }))
    .filter((x) => x.items.length > 0)
    .map((x) => ({
      analysis: x.analysis,
      note: x.items.map((i) => `${i.label} ${i.name}`).join(" / "),
    }));

  const budgetUp = analyses
    .filter((a) => a.budgetGrowth !== null && a.budgetGrowth > 0)
    .sort((a, b) => (b.budgetGrowth ?? 0) - (a.budgetGrowth ?? 0))
    .map((a) => ({ analysis: a, note: `前年度比 +${a.budgetGrowth!.toFixed(1)}%` }));

  const budgetDown = analyses
    .filter((a) => a.budgetGrowth !== null && a.budgetGrowth < 0)
    .sort((a, b) => (a.budgetGrowth ?? 0) - (b.budgetGrowth ?? 0))
    .map((a) => ({ analysis: a, note: `前年度比 ${a.budgetGrowth!.toFixed(1)}%` }));

  const lowExecution = analyses
    .filter((a) => a.executionRate !== null && a.executionRate < 85)
    .sort((a, b) => (a.executionRate ?? 0) - (b.executionRate ?? 0))
    .map((a) => ({
      analysis: a,
      note: `${a.latestSettlementYear}年度 執行率 ${a.executionRate!.toFixed(1)}%`,
    }));

  const outcomeDown = analyses
    .filter((a) => a.outcomeGrowth !== null && a.outcomeGrowth < 0)
    .sort((a, b) => (a.outcomeGrowth ?? 0) - (b.outcomeGrowth ?? 0))
    .map((a) => ({
      analysis: a,
      note: `${a.outcomeLabel} ${a.outcomePrevious} → ${a.outcomeLatest}(${a.outcomeGrowth!.toFixed(1)}%)`,
    }));

  const generalFundUp = analyses
    .filter((a) => a.generalFundGrowth !== null && a.generalFundGrowth > 0)
    .sort((a, b) => (b.generalFundGrowth ?? 0) - (a.generalFundGrowth ?? 0))
    .map((a) => ({
      analysis: a,
      note: `${a.latestSettlementYear}年度 一般財源 前年度比 +${a.generalFundGrowth!.toFixed(1)}%`,
    }));

  const continuingIssue = analyses
    .filter((a) => a.issueYears.length >= 3)
    .map((a) => ({ analysis: a, note: `${a.issueYears.join("・")}に課題の記載あり` }));

  return [
    {
      key: "new",
      title: `${latestYear ?? ""}年度の新規・拡充事業`,
      description: "予算資料に新規事業・拡充として記載されているもの",
      items: newThisYear,
    },
    {
      key: "budget-up",
      title: "予算が増えた事業",
      description:
        "直近年度の予算額を、資料のある前年度と比較(直近年度は当初予算、前年度は予算現額のため基準が異なります)",
      items: budgetUp,
    },
    {
      key: "budget-down",
      title: "予算が減った事業",
      description:
        "直近年度の予算額を、資料のある前年度と比較(直近年度は当初予算、前年度は予算現額のため基準が異なります)",
      items: budgetDown,
    },
    {
      key: "low-execution",
      title: "執行率が低い事業",
      description: "直近の決算年度で執行率85%未満",
      items: lowExecution,
    },
    {
      key: "outcome-down",
      title: "成果指標が悪化した事業",
      description: "代表的な成果指標(OUTCOME)が前年度より減少",
      items: outcomeDown,
    },
    {
      key: "general-fund-up",
      title: "一般財源負担が増えた事業",
      description: "直近の決算年度の一般財源を前年度と比較",
      items: generalFundUp,
    },
    {
      key: "continuing-issue",
      title: "課題が継続して記載されている事業",
      description: "資料のある3年度以上で課題の記載があるもの",
      items: continuingIssue,
    },
  ];
}
