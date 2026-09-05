import Link from "next/link";
import { getAllProjectSummaries } from "@/lib/data";
import { AppShell } from "@/components/layout/AppShell";

/**
 * トップページ: 事業一覧(現時点では移住・定住促進事業のみ)。
 * 検索・自動抽出スポットライト(新規事業/予算増減/執行率低下等)は
 * 事業データが複数件揃った段階で実装する(現状は「準備中」と明示する)。
 */
export default function HomePage() {
  const projects = getAllProjectSummaries();
  const defaultProjectId = projects[0]?.projectId ?? null;

  return (
    <AppShell defaultProjectId={defaultProjectId}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">気仙沼市 政策・予算ダッシュボード</h1>
        <p className="mt-2 text-sm text-slate-600">
          予算・決算・主要施策の成果を事業単位で結びつけ、経年でどう変化してきたかを見るためのサイトです。
        </p>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-slate-700">事業一覧</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500">準備中: 事業データがまだ登録されていません。</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.projectId}>
                  <Link
                    href={`/projects/${p.projectId}/`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-mode-budget hover:shadow-md"
                  >
                    <p className="text-xs text-slate-500">{p.department}</p>
                    <p className="mt-1 font-semibold text-slate-900">{p.canonicalName}</p>
                    <p className="mt-1 text-xs text-slate-400">{p.budgetCategory}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-600">今後追加予定の分析(準備中)</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
            <li>今年の新規事業</li>
            <li>予算が大きく増えた/減った事業</li>
            <li>執行率が低い事業</li>
            <li>成果指標が悪化した事業</li>
            <li>一般財源負担が増えた事業</li>
            <li>3年連続で課題として記載されている事業</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
