# データモデル設計(初稿)

前提資料: [source-inventory.md](./source-inventory.md)

## 1. 設計方針

- **推測で埋めない**: 原典に存在しない値は `null` とし、表示側で「資料記載なし」「未確認」「算出不可」に変換する。
  AIが生成した要約文であっても、必ず `source_document` / `source_page` / `source_text` を伴わせる。
- **事業名は永続IDと分離する**: 表示名は年度で揺れうるので、`project_id` を主キーにし、年度ごとの
  表示名は `yearlyLabel` として別途持たせる。
- **数値は円単位・無丸めで保持**: 資料上は千円単位表記が多いが、内部は円に統一し、表示層でのみ
  円/千円/万円/億円を切り替える。
- **抽出プロセスを可視化する**: RAW → 自動抽出 → 正規化 → 候補マッチング → 人間確認 → 確定 の
  各段階を型として表現し、`confidence` と `matchMethod` を必ず持たせる。

## 2. 型定義(TypeScript, 実装時の src/types のたたき台)

```ts
// ---- 共通: 出典情報 ----
type SourceDocument =
  | "R4決算書" | "R6決算書" | "R7決算書"
  | "R6予算書" | "R8予算書"
  | "R6予算説明資料" | "R7予算説明資料" | "R8予算説明資料"
  | "R4成果報告書" | "R6成果報告書" | "R7成果報告書";

interface Citation {
  sourceDocument: SourceDocument;
  sourcePage: number | null;   // 資料記載なしなら null
  sourceText: string | null;   // 原文抜粋(表示用に短縮してよいが改変はしない)
}

// 値そのものと出典をセットで持つラッパー。null許容を必須にする
interface Sourced<T> {
  value: T | null;
  citation: Citation | null;
  confidence: "高" | "中" | "低";
}

// ---- 事業マスター ----
type ProjectStatus =
  | "継続" | "新規" | "拡充" | "縮小" | "終了" | "統合" | "分割";

interface ProjectMaster {
  projectId: string;              // 永続ID 例: "migration-settlement-001"
  canonicalName: string;          // 例: "移住・定住促進事業"
  aliases: string[];              // 表記ゆれ・旧名称
  department: string;             // 所管部
  section: string;                // 所管課
  policyCategory: string;         // 総合計画の政策分野(予算説明資料の総計基本施策分類)
  budgetCategory: string;         // 例: "2款1項7目"
  notes?: string;
}

// ---- 年度別データ ----
type FiscalYear = "R4" | "R5" | "R6" | "R7" | "R8"; // R5は資料なし(欠損として保持)

interface BudgetFigures {
  initial: Sourced<number>;       // 当初予算
  supplementary: Sourced<number>; // 補正予算(複数回ある場合は配列も検討)
  final: Sourced<number>;         // 最終予算(予算現額)
  previousYear: Sourced<number>;  // 前年度予算(参考表示用。集計時は前年度データから引ける)
}

interface SettlementFigures {
  amount: Sourced<number>;        // 決算額
  unspent: Sourced<number>;       // 不用額
  executionRate: Sourced<number>; // 執行率(%)
}

interface FundingSources {
  nationalGrant: Sourced<number>;   // 国庫支出金
  prefecturalGrant: Sourced<number>;// 県支出金
  municipalBond: Sourced<number>;   // 地方債
  fund: Sourced<number>;            // 基金
  other: Sourced<number>;
  generalFund: Sourced<number>;     // 一般財源
}

interface ImplementationContent {
  mainSubProjects: Sourced<string>[];   // メイン事業(サブ事業名+金額などをテキストで)
  newSubProjects: Sourced<string>[];    // 新規事業
  expandedSubProjects: Sourced<string>[];
  discontinuedSubProjects: Sourced<string>[];
}

// 活動実績(OUTPUT)・成果(OUTCOME)は資料の書式が事業ごとに違うため、
// key-valueの配列として持たせ、固定スキーマにしない
interface MetricEntry {
  label: string;        // 例: "移住相談件数"
  value: Sourced<string>; // 数値+単位をそのまま文字列で保持(例: "212件")。集計用の数値は別途 numericValue
  numericValue?: number | null;
}

interface OutputOutcome {
  outputs: MetricEntry[];   // 活動実績
  outcomes: MetricEntry[];  // 成果指標
  kpiAchievementRate: Sourced<number> | null;
  qualitativeOutcome: Sourced<string> | null; // 定性的成果
}

interface IssuesAndResponse {
  issue: Sourced<string> | null;          // 行政が記載した課題
  nextYearResponse: Sourced<string> | null; // 翌年度の対応(新設/拡充/縮小/制度変更)
}

// 新規事業検出結果
interface NewInitiative {
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

// ---- 年度スナップショット(1事業×1年度) ----
interface ProjectYearRecord {
  projectId: string;
  year: FiscalYear;
  yearlyLabel: string;              // その年度の資料上の表示名(表記ゆれ込み)
  status: ProjectStatus;
  purpose: Sourced<string> | null;      // 目的
  overview: Sourced<string> | null;     // 事業概要
  budget: BudgetFigures | null;         // 資料が無い年は null
  settlement: SettlementFigures | null;
  funding: FundingSources | null;
  implementation: ImplementationContent | null;
  outputOutcome: OutputOutcome | null;
  issuesAndResponse: IssuesAndResponse | null;
  newInitiatives: NewInitiative[];
  citations: Citation[];                // このレコード全体の裏付け一覧(重複可)
}

// ---- 事業名マッチングの記録(RAW→確定の途中経過を残す) ----
type MatchMethod = "exact" | "alias" | "fuzzy" | "manual";

interface ProjectMatchLog {
  projectId: string;
  year: FiscalYear;
  sourceDocument: SourceDocument;
  rawName: string;             // 資料に印字されていた事業名そのまま
  matchMethod: MatchMethod;
  confidence: "高" | "中" | "低";
  reviewedBy?: "AI" | "human";
  reviewedAt?: string;
}

// ---- 議会答弁(取得できる範囲でオプショナル) ----
interface Answer {
  projectId: string;
  date: string | null;
  askedBy: Sourced<string>;
  question: Sourced<string>;
  answeredBy: Sourced<string>;
  answerSummary: Sourced<string>;
  followUpStatus: "実施" | "一部実施" | "継続検討" | "未確認";
}
```

## 3. 抽出パイプラインの段階(`/scripts` の責務分離と対応)

```
RAW (pdftotextの生テキスト、scratchpad/pdftxt/*.txt)
  ↓ scripts/extract
自動抽出 (款/項/目・事業名・金額・見出し語で正規表現抽出した候補)
  ↓ scripts/normalize
正規化 (千円→円換算、全角/半角統一、事業名の表記ゆれ吸収前の素の値)
  ↓ scripts/match-projects
候補マッチング (projectId候補への割当て。ProjectMatchLog を生成、matchMethod確定)
  ↓ (人間確認: 今回のプロトタイプ段階ではAIが確認者を兼ねるが、confidence=低の項目は
     UI上で明示し、実データ化した5事業については本人(ユーザー)によるレビューを推奨)
人間確認
  ↓ scripts/validate
確定データ (data/projects/*.json、Web表示に使う最終形)
```

`confidence` は主に以下の基準で付与する:

- **高**: 事業名が完全一致し、款/項/目コードも一致
- **中**: 事業名は一致するが款/項/目コードが年度で変わっている、または金額が複数箇所から推定合算されている
- **低**: fuzzy一致のみ、または自由記述(【事業内容】欄)からの数値抽出で書式が事業ごとに異なるもの

## 4. データ保存形式(初期)

- `/data/raw/` : pdftotext抽出結果のコピー(必要な範囲のみ。巨大テキストは全量コミットせず、
  参照ページ抜粋のみ保存する方針を検討)
- `/data/normalized/` : 款/項/目・事業名・金額を正規化したJSON(年度×資料種別ごと)
- `/data/projects/{projectId}.json` : `ProjectMaster` + `ProjectYearRecord[]` を1事業1ファイルにまとめた確定データ
- 件数が数百件規模のうちはJSONで十分。将来SQLite/PostgreSQLへ移行する場合、`ProjectYearRecord`を
  そのままテーブル1行に対応させられるようスキーマをフラットに保つ(ネストが深い`Sourced<T>`部分は
  `citations`テーブルに正規化する想定)

## 5. 未確定事項(実装時に決めること)

- 「地域おこし協力隊事業」のように同名事業が複数款にまたがる場合、`projectId`を款ごとに分けるか、
  1つの`projectId`で`budgetCategory`を配列にするか → source-inventory.mdの§5参照、パイロットで検証する
- 議会答弁データの取得元(今回の12資料には含まれていない可能性が高い。会議録等の追加資料が必要か確認)
