# このリポジトリのお作法(AI向けの前提)

気仙沼市の予算・決算・主要施策の成果を「事業単位・4つの視点」で可視化する
Next.js アプリです。GitHub Pages で
`https://tomoyuki0721.github.io/hackatsuon2/` というサブパス配下に公開されます。

> 注: このリポジトリは元々「1ファイル完結の素のHTML」ワークショップ用スターターでしたが、
> 本プロジェクトの要件(事業データの経年比較・4モード切替・出典管理)により
> Next.js の静的書き出し構成へ移行済みです。素のHTML時代のルールは適用しません。

## 技術構成

- Next.js 14(App Router)+ TypeScript + Tailwind CSS、グラフは Recharts
- `next.config.js` で `output: "export"`(静的書き出し)。サーバーは動きません
- `basePath` / `assetPrefix` は本番のみ `/hackatsuon2`。**絶対パスの直書きは禁止**
  (`next/link` と `next/image` は basePath を自動で解決するので、それらを使う)
- 公開は `.github/workflows/deploy.yml` による GitHub Actions デプロイ
  (Pages の Source は「GitHub Actions」に設定済み)

## 守ってほしいこと

### データの扱い(最重要)

- すべての数値・成果・課題は `Sourced<T>` 型(`src/types/project.ts`)で包み、
  `sourceDocument` / `sourcePage` / `sourceText` を必ず持たせる
- **AIが生成した数字を事実として保存しない**。原典に無いものは
  `資料記載なし` / `未確認` / `算出不可` のいずれかで明示する
- 特に 成果・KPI・課題・事業統合 について、推測で補完しない
- 金額は内部では常に「円」の整数で保持し、丸めは表示直前だけ(`src/lib/format.ts`)

### 実装上の約束

- `useSearchParams` を使わない。静的書き出しでは Suspense 配下のサブツリーが
  `BAILOUT_TO_CLIENT_SIDE_RENDERING` となり、静的HTMLが空になる
  (詳細は `src/components/layout/AppShell.tsx` のコメント)。
  画面状態は `ProjectPageClient` の `useState` で持ち、props で配る
- 色だけで状態を伝えない。必ずアイコンかラベルを併記する
- 画面の文言は日本語。PC優先だがスマホでも崩れないようにする

## ディレクトリ

- `src/app/` — ページ(トップ / `projects/[projectId]`)
- `src/components/` — UI(`layout/` `ui/` `charts/` `modes/`)
- `src/lib/` — データ読み込み・整形・年度ヘルパー
- `data/projects/*.json` — 事業データ(1事業=1ファイル)
- `docs/` — 資料棚卸し・データモデル・マッチング規則・UI設計・アーキテクチャ

## ローカル実行

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # out/ に静的書き出し
```
