// data-model.md の型定義をそのまま実装に落としたもの。
// 「資料に無い値は null」を徹底し、UI側で必ず「資料記載なし」等に変換すること。

export type SourceDocument =
  | "R4決算書"
  | "R6決算書"
  | "R7決算書"
  | "R6予算書"
  | "R8予算書"
  | "R6予算説明資料"
  | "R7予算説明資料"
  | "R8予算説明資料"
  | "R4成果報告書"
  | "R6成果報告書"
  | "R7成果報告書";

export interface Citation {
  sourceDocument: SourceDocument;
  sourcePage: string | null; // 資料はページ範囲表記(例: "81～83")があるため文字列で保持
  sourceText: string | null;
}

export type Confidence = "高" | "中" | "低";

export interface Sourced<T> {
  value: T | null;
  citation: Citation | null;
  confidence: Confidence;
}

export type ProjectStatus =
  | "継続"
  | "新規"
  | "拡充"
  | "縮小"
  | "終了"
  | "統合"
  | "分割";

export type FiscalYear = "R4" | "R5" | "R6" | "R7" | "R8";

export const FISCAL_YEARS: FiscalYear[] = ["R4", "R5", "R6", "R7", "R8"];

export interface ProjectMaster {
  projectId: string;
  canonicalName: string;
  aliases: string[];
  department: string;
  section: string;
  policyCategory: string;
  budgetCategory: string;
  notes?: string;
}

export interface BudgetFigures {
  initial: Sourced<number>;
  supplementary: Sourced<number>;
  final: Sourced<number>;
  previousYear: Sourced<number>;
}

export interface SettlementFigures {
  amount: Sourced<number>;
  unspent: Sourced<number>;
  executionRate: Sourced<number>;
}

export interface FundingSources {
  nationalGrant: Sourced<number>;
  prefecturalGrant: Sourced<number>;
  municipalBond: Sourced<number>;
  fund: Sourced<number>;
  other: Sourced<number>;
  generalFund: Sourced<number>;
}

export interface ImplementationContent {
  mainSubProjects: Sourced<string>[];
  newSubProjects: Sourced<string>[];
  expandedSubProjects: Sourced<string>[];
  discontinuedSubProjects: Sourced<string>[];
}

export interface MetricEntry {
  label: string;
  value: Sourced<string>;
  numericValue?: number | null;
}

export interface OutputOutcome {
  outputs: MetricEntry[];
  outcomes: MetricEntry[];
  kpiAchievementRate: Sourced<number> | null;
  qualitativeOutcome: Sourced<string> | null;
}

export interface IssuesAndResponse {
  issue: Sourced<string> | null;
  nextYearResponse: Sourced<string> | null;
}

export interface NewInitiative {
  name: string;
  startYear: FiscalYear;
  budget: Sourced<number>;
  funding: Sourced<string>;
  purpose: Sourced<string>;
  targetAudience: Sourced<string>;
  content: Sourced<string>;
  expectedOutcome: Sourced<string>;
  label: "NEW" | "拡充" | "対象拡大" | "制度変更";
}

export interface ProjectYearRecord {
  year: FiscalYear;
  yearlyLabel: string;
  status: ProjectStatus;
  purpose: Sourced<string> | null;
  overview: Sourced<string> | null;
  budget: BudgetFigures | null;
  settlement: SettlementFigures | null;
  funding: FundingSources | null;
  implementation: ImplementationContent | null;
  outputOutcome: OutputOutcome | null;
  issuesAndResponse: IssuesAndResponse | null;
  newInitiatives: NewInitiative[];
}

export interface ProjectData {
  master: ProjectMaster;
  years: ProjectYearRecord[];
}

export type MatchMethod = "exact" | "alias" | "fuzzy" | "manual";

export interface ProjectMatchLog {
  projectId: string;
  year: FiscalYear;
  sourceDocument: SourceDocument;
  rawName: string;
  matchMethod: MatchMethod;
  confidence: Confidence;
}

export type ViewMode = "budget" | "settlement" | "question" | "citizen";
export type DetailLevel = "normal" | "detail";
