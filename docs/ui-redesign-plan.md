# UI再設計プラン

## 0. 目的

データロジック(型定義・出典管理・計算関数・年度マッチング)は変更せず、
「事業を4つの視点(予算/決算/一般質問/市民)で切り替えて見る」という情報設計を
自治体公式サイトとして信頼感のある、議会審査にも耐える情報密度のUIで再実装する。

## 1. 現状調査(変更しない部分)

### 1.1 技術スタック
- Next.js 14 (App Router)、`output: "export"` による静的書き出し(GitHub Pages, basePath=`/hackatsuon2`)
- TypeScript, Tailwind CSS(`tailwind.config.js`にmodeカラー4色を定義済み)
- グラフ: Recharts(`BudgetSettlementChart.tsx`で棒グラフ実装済み。dataviz skillの検証済みパレット使用)
- ローカルにNode.js/npmが無く、動作確認はGitHub Actions経由のGitHub Pagesデプロイで行っている

### 1.2 ルーティング構造(変更しない)
- `src/app/page.tsx` — トップページ(事業一覧)
- `src/app/projects/[projectId]/page.tsx` — 事業詳細ページ、`generateStaticParams`で全事業を静的生成
- URL状態: `?mode=budget|settlement|question|citizen&view=normal|detail` をクエリで保持(`ProjectView.tsx`が`useSearchParams`/`router.replace`で同期)

### 1.3 データ取得(変更しない)
- `src/lib/data.ts`: `getAllProjectIds` / `getProjectData` / `getAllProjectSummaries`(ビルド時に`data/projects/*.json`をfsで読み込むサーバー専用関数)
- `src/lib/project-helpers.ts`: `sortedYears` / `latestYearRecord` / `previousYearRecord` / `latestYearWithSettlement`
- `src/lib/format.ts`: `formatYen` / `growthRate` / `executionRate` / `unspentAmount` / `unitCost` 等、すべてnullセーフ
- `src/types/project.ts`: `Sourced<T>`(出典・信頼度ラッパー)を中心とした型体系。**変更しない**

### 1.4 既存コンポーネント(置き換え対象)
- `ProjectView.tsx` — モード/詳細切り替えの親。**維持(ロジックのみ)、UIは全面刷新**
- `modes/BudgetMode.tsx` `SettlementMode.tsx` `QuestionMode.tsx` `CitizenMode.tsx` — **UIを全面刷新**、propsシグネチャ(`{data, detail}`)は維持
- `Citation.tsx`(出典バッジ) — **維持・流用**
- `SourcedValue.tsx`(`SourcedText`/`SourcedYen`) — **維持しつつ見た目を調整**
- `NewInitiativeCard.tsx` — **NewProjectCardとして刷新**
- `BudgetSettlementChart.tsx` — **TrendChartとして拡張**(予算/決算の経年比較に加え、一般質問モードでも使用)

### 1.5 4モードと通常/詳細
- 現状: `ProjectView`のタブボタン+トグルボタンで`mode`/`view`をURLクエリに反映。**この状態管理の仕組みはそのまま使う**
- 通常表示/詳細モードは同一ページ内での切り替え(遷移なし) — **既存の設計方針を維持**

## 2. 変更するUI / 新規作成する共通コンポーネント

既存のデータ取得・計算・型を一切変更せず、表示層だけを差し替える。
すべて`ProjectData` / `ProjectYearRecord` / `Sourced<T>`をそのまま受け取るpropsにする。

| コンポーネント | 役割 | 配置 |
|---|---|---|
| `AppHeader` | サイト名・検索・使い方/お気に入り/メニュー | `src/components/layout/AppHeader.tsx` |
| `Sidebar` | ホーム/4モード(テーマ文言付き)/事業を探す等。モバイルはハンバーガー | `src/components/layout/Sidebar.tsx` |
| `AppShell` | ヘッダー+サイドバー+コンテンツのグリッドを組むレイアウト器 | `src/components/layout/AppShell.tsx` |
| `ModeNavigation` | Sidebar内の4モードリンク部分(色・アイコン・選択状態) | `src/components/layout/ModeNavigation.tsx`(Sidebarに内包) |
| `DisplayModeTabs` | ［通常表示］［詳細モード］の大きいタブ | `src/components/ProjectHeader/DisplayModeTabs.tsx` |
| `ProjectHeader` | 事業名・キャッチコピー・タグ・所管・年度選択・PDFを見る・お気に入り | `src/components/ProjectHeader.tsx` |
| `KpiCard` | 大きい数字+小さい単位+前年比矢印 | `src/components/ui/KpiCard.tsx` |
| `SectionCard` | 白背景・角丸・薄い境界線・弱い影の汎用カード枠 | `src/components/ui/SectionCard.tsx` |
| `StatusBadge` | 継続/新規/拡充/縮小/終了等、アイコン+ラベル | `src/components/ui/StatusBadge.tsx` |
| `NewProjectCard` | 新規事業カード(名称/予算/目的/対象/内容/期待成果) | `src/components/ui/NewProjectCard.tsx` |
| `FinanceDonutChart` | 財源内訳ドーナツ(Recharts PieChart) | `src/components/charts/FinanceDonutChart.tsx` |
| `TrendChart` | 経年の棒/折れ線(既存BudgetSettlementChartを一般化) | `src/components/charts/TrendChart.tsx` |
| `ExecutionGauge` | 執行率の円形ゲージ | `src/components/charts/ExecutionGauge.tsx` |
| `OutcomeCard` | 成果(OUTCOME)アイコンカード | `src/components/ui/OutcomeCard.tsx` |
| `IssueCard` | 課題カード(緑=評価/赤系=課題の使い分け) | `src/components/ui/IssueCard.tsx` |
| `SourceReference` | 出典ポップオーバー(既存Citation.tsxをラップ) | 既存を流用 |
| `RelatedInfoCard` | 関連情報リンク一覧 | `src/components/ui/RelatedInfoCard.tsx` |

## 3. 画面構成(PC)

```
┌─────────────────────────────────────────────┐
│ AppHeader (サイト名 / 検索 / 使い方・お気に入り・メニュー)   │
├───────────┬─────────────────────────────┤
│ Sidebar   │ パンくず                              │
│ (固定幅   │ モードタイトル(テーマ文言)              │
│  240px)   │ ProjectHeader(事業名・タグ・所管・年度)  │
│           │ DisplayModeTabs                        │
│ ホーム     │ KPIカード(横並び)                       │
│ 予算       │ ── 中段(2〜3カラム: 主な事業/新規/財源) │
│ 決算       │ ── 下段(期待効果・論点・関連情報)        │
│ 一般質問   │                                        │
│ 市民       │                                        │
│ ──        │                                        │
│ 事業を探す │                                        │
│ 分野から   │                                        │
│ 用語集     │                                        │
│ データについて│                                     │
└───────────┴─────────────────────────────┘
```

- コンテンツ幅は`max-w`を`5xl`→`7xl`程度に拡大し、PCでの一覧性を優先する(現状は`max-w-5xl`中央寄せのみでサイドバーがない)。
- サイドバーはCSS Gridで`grid-template-columns: 240px 1fr`、モバイルは1カラム+ハンバーガー。

## 4. レスポンシブ方針

- PC(`lg:`以上): サイドバー常時表示、KPIは4〜5枚横並び、中段は2〜3カラムグリッド
- タブレット(`md:`): サイドバーは折りたたみ可能、KPIは2列
- スマホ(`sm:`以下): サイドバーはハンバーガーメニュー(オーバーレイ)、KPIは横スクロールまたは2列、表はカード化

## 5. カラールール

モードカラー(既存`tailwind.config.js`の`mode.*`を流用、彩度を少し落とした行政向けトーンに調整):

| モード | 色 | 用途 |
|---|---|---|
| 予算 | Blue (`mode.budget`) | サイドバー選択状態、KPIアクセント、予算モードのタブ・見出し |
| 決算 | Green (`mode.settlement`) | 同上 |
| 一般質問 | Orange (`mode.question`) | 同上 |
| 市民 | Pink (`mode.citizen`) | 同上 |

- 色だけに依存しない: 各モードにテーマ文言・アイコン(絵文字またはSVG)・ラベルを併記する(既存の`CitationBadge`の信頼度バッジと同様の考え方)。
- 新規事業は独立したアクセント(ピンク/赤系の縁取り+「NEW」バッジ)で、既存の`SettlementFigures`等の数値カードとは視覚的に混在させない。
- ステータス色(執行率が低い、課題が長期化 等の警告)は、既存のdataviz skillのstatus paletteに準じ、アイコン+ラベル併記を必須とする。

## 6. 実装順と進捗

1. [x] 共通レイアウト(`AppShell`, `AppHeader`, `Sidebar`)
2. [x] `ProjectHeader` + `DisplayModeTabs`
3. [x] 予算モード通常表示(`KpiCard`, `SectionCard`, `NewProjectCard`, `FinanceDonutChart`)
4. [x] GitHub Pagesへデプロイして表示確認
   - このとき、静的書き出し時に`useSearchParams`を使うと事業ページ全体が空白になる不具合が判明したため、
     状態管理を`ProjectPageClient`の`useState`に移して修正済み(詳細は`AppShell.tsx`のコメント)。
5. [x] 予算詳細(タブ: 事業内容/積算内訳/財源内訳/前年度比較/成果との整合)
6. [x] 決算通常(KPI+円形ゲージ+財源別横棒+OUTPUT/OUTCOME+評価/課題+審査論点)
7. [x] 決算詳細(タブ: 執行状況/実施内容/成果・評価/課題/費用対効果)
8. [x] 一般質問通常(期間切替/予算決算推移/成果指標推移/政策の流れ/答弁欄/論点/質問案)
9. [x] 一般質問詳細(タブ: 時系列分析/課題と対応/過去答弁/政策指標/質問案)
10. [x] 市民通常(平易な説明/成果アイコンカード/今年の取り組み/FAQ)
11. [x] 市民詳細(タブ: 事業の内容/暮らしとの関係/利用方法/FAQ/お金の内訳)

### データ側の変更(1件のみ)

`data/projects/migration-settlement-001.json` で「移住者数(センター経由)」を`outputs`から`outcomes`へ移した。
値・出典・信頼度は一切変更していない。理由: 移住者数は「実際の政策目的達成人数」であり、
データモデル上のOUTCOMEの定義に該当するため。これにより決算モードのOUTCOME欄が機能する。

### 資料が無いため実装できていないもの(推測で埋めていない箇所)

- 過去の一般質問・委員会質疑・議会答弁 → 会議録データが未提供のため「未確認」と明示
- 利用方法の具体的な窓口・連絡先 → 原典に記載がないため所管課への問い合わせを案内
- KPI達成率 → 目標値が原典に無いため「算出不可」
- 費目別(需用費・委託料等)の積算根拠 → 予算説明資料に事業単位の記載が無い

## 7. 維持することの再確認(チェックリスト)

- [x] `Sourced<T>`型と出典バッジの表示ロジックは変更しない
- [x] 「資料記載なし/未確認/算出不可」の3ラベルによる欠損表現は維持する
- [x] `getAllProjectIds` / `getProjectData` 等のデータ取得APIは変更しない
- [x] `?mode=&view=`のURL状態管理は変更しない
- [x] 事業マスタ(`ProjectMaster`)・年度別レコード(`ProjectYearRecord`)のスキーマは変更しない
- [ ] UIのためにどうしても必要な場合のみ、ViewModel的な変換関数(例: KPIカード用に複数フィールドをまとめる`buildBudgetKpis(data)`のようなヘルパー)を`src/lib/`に追加する(データそのものは加工しない、表示用の組み立てのみ)
