import Link from "next/link";
import type { Spotlight } from "@/lib/analysis";

/**
 * 自動抽出。すべて出典のある数値からの計算結果で、該当が無い場合は「該当なし」と明示する
 * (件数を埋めるために基準を緩めたり、推測で項目を作ったりしない)。
 */
export function Spotlights({ spotlights }: { spotlights: Spotlight[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {spotlights.map((s) => (
        <section key={s.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">{s.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>

          {s.items.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {s.items.map((item) => (
                <li key={item.analysis.projectId}>
                  <Link
                    href={`/projects/${item.analysis.projectId}/`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                  >
                    <span className="text-sm font-medium text-slate-800">{item.analysis.name}</span>
                    <span className="text-xs tabular-nums text-slate-500">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              該当なし(現在登録されている事業の範囲では、この条件に当てはまるものはありません)
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
