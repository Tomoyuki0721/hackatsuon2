# アーキテクチャ設計

## 1. ホスティング方針(確定)

- GitHub Pages(静的公開)を維持する
- Next.js は `output: 'export'` (旧 `next export` 相当)で静的HTMLに書き出す
- リポジトリ名 `hackatsuon2` がそのまま公開URLのサブパスになる
  (`https://tomoyuki0721.github.io/hackatsuon2/`)ため、`next.config.js` で
  `basePath` / `assetPrefix` を `/hackatsuon2` に固定する
- 画像最適化API(`next/image`のデフォルト最適化)はサーバーが必要なため使用不可。
  `images: { unoptimized: true }` を設定する
- 動的ルート `/projects/[projectId]` は `generateStaticParams` で全事業IDを列挙し、
  ビルド時に全ページを静的生成する。モード切替(`?mode=budget`等)はURLクエリで表現するが、
  クエリ自体はNext.jsの静的パス列挙の対象外(クライアント側の状態として`useSearchParams`で読む)
  なので `output: export` と両立する
- `trailingSlash: true` を設定し、`/projects/foo/index.html` の形で書き出す
  (GitHub Pagesでディレクトリ形式のURLを正しく解決させるため)
- `public/.nojekyll` を配置する(GitHub PagesのデフォルトJekyll処理が `_next` ディレクトリを
  無視してしまうのを防ぐため必須)

## 2. デプロイフロー(README.mdの更新が必要)

現行の `README.md` は「Settings → Pages → Deploy from a branch → main/(root)」という
ビルド不要の手順を案内しているが、Next.jsのビルド成果物(`out/`)を配信するには
**GitHub Actions経由のデプロイに切り替える必要がある**。

- リポジトリ設定: Settings → Pages → Build and deployment → Source を
  **「GitHub Actions」** に変更する(これは人がGitHub UI上で行う必要があり、Claude Codeからは変更できない)
- `.github/workflows/deploy.yml` を用意し、`main` へのpush時に
  1. Node 20セットアップ
  2. `npm ci`
  3. `npm run build`(`next.config.js`の`output: 'export'`により`out/`が生成される)
  4. `actions/upload-pages-artifact@v3` で `out/` をアップロード
  5. `actions/deploy-pages@v4` でデプロイ
  という流れにする
- README.mdのStep 6(GitHub Pages公開手順)は上記に合わせて後日更新する(今回のPhaseでは
  実装のみ行い、ワークショップ向け説明文の全面書き換えは別タスクとする)

## 3. ディレクトリ構成

```
/
├── .github/workflows/deploy.yml   # 静的書き出し→Pages公開
├── data/
│   ├── raw/                       # pdftotext抽出結果からの抜粋(全量は入れない)
│   ├── normalized/                # 款/項/目・事業名・金額を正規化したJSON(年度×資料種別)
│   └── projects/                  # 確定データ。1事業1ファイル(ProjectMaster+年度別レコード)
├── scripts/
│   ├── extract/                   # RAW→自動抽出候補
│   ├── normalize/                 # 正規化
│   ├── match-projects/            # 事業名マッチング、ProjectMatchLog生成
│   ├── calculate/                 # 増減率・執行率・単価などの自動計算
│   └── validate/                  # 確定データの整合性チェック(citation必須チェック等)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx                       # トップページ(検索・自動抽出リスト)
│   │   └── projects/[projectId]/page.tsx  # 事業詳細ページ(4モード切替)
│   ├── components/                # UIコンポーネント(モード別カード、グラフ等)
│   ├── lib/                       # データ読み込み・増減計算・単価計算等の純粋関数
│   └── types/                     # data-model.mdのTypeScript型定義
├── docs/
│   ├── source-inventory.md        # 済
│   ├── data-model.md              # 済
│   ├── matching-rules.md          # 今回作成
│   └── architecture.md            # 本ファイル
└── public/
    ├── .nojekyll
    └── sources/                   # 参照用に切り出したPDF抜粋(将来的に原文リンク用)
```

既存の `index.html` (ワークショップ初心者向けスターター)は削除済み(2026-09-05)。
`output: export` のビルド成果物が `out/index.html` として生成され、これが公開時のトップページとなる。
なお Pages の Source を「GitHub Actions」に切り替えた時点で、リポジトリ直下のファイルは
配信対象ではなくなっている(配信されるのはワークフローがアップロードした `out/` の中身のみ)。

## 4. 事業ページのURL構造

```
/projects/{projectId}?mode=budget|settlement|question|citizen&view=normal|detail
```

- `projectId` は `ProjectMaster.projectId`(例: `migration-settlement-001`)
- `mode` 省略時は `budget`、`view` 省略時は `normal` をデフォルトとする
- モード切替・詳細切替はクライアントサイドの状態遷移(ページ遷移を伴わないタブUI)とし、
  `router.replace` でURLのクエリのみ更新する(ブラウザ「戻る」で状態を戻せるように)

## 5. データフローの実行時モデル

静的サイトのためAPIサーバーは存在しない。ビルド時に `data/projects/*.json` を
`import`(またはfs読み込み)し、`generateStaticParams`ですべての`projectId`を列挙、
各ページに必要なデータを`props`として埋め込む(ビルド時に完全に静的化)。
検索機能(トップページ)もクライアント側JSでの絞り込み(全事業の軽量インデックスJSONを
ページ読み込み時に取得しフィルタ)とし、サーバー検索APIは持たない。
