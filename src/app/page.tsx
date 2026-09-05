import { getAllProjects } from "@/lib/data";
import { analyzeProject, buildSpotlights } from "@/lib/analysis";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectSearch } from "@/components/home/ProjectSearch";
import { Spotlights } from "@/components/home/Spotlights";

/**
 * トップページ。ビルド時に全事業を読み込んで横断分析を行い、
 * 検索・絞り込み(クライアント側)と自動抽出(静的)を表示する。
 */
export default function HomePage() {
  const projects = getAllProjects();
  const analyses = projects.map(analyzeProject);
  const spotlights = buildSpotlights(analyses);
  const defaultProjectId = analyses[0]?.projectId ?? null;

  return (
    <AppShell defaultProjectId={defaultProjectId}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">気仙沼市 政策・予算ダッシュボード</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          予算・決算・主要施策の成果を事業単位で結び付け、年度をまたいで政策がどう変わってきたかを見るためのサイトです。
          表示している数値はすべて市の公開資料が出典で、資料に記載が無いものは「資料記載なし」と明示しています。
        </p>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-slate-700">事業を探す</h2>
          <ProjectSearch analyses={analyses} />
        </section>

        <section className="mt-10">
          <h2 className="mb-1 text-sm font-bold text-slate-700">気になる動きを自動で抽出</h2>
          <p className="mb-3 text-xs text-slate-400">
            出典のある予算額・決算額・成果指標から本システムが計算した結果です。判断そのものではなく、
            確認すべき事業を見つけるための手がかりとしてご覧ください。
          </p>
          <Spotlights spotlights={spotlights} />
        </section>

        <p className="mt-10 text-xs leading-relaxed text-slate-400">
          ※ 現在 {analyses.length} 事業を登録しています。対象年度は令和4・6・7・8年度で、
          令和5年度は資料が存在しないため欠落年度として扱っています(補間していません)。
        </p>
      </div>
    </AppShell>
  );
}
