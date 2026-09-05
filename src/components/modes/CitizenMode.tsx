import type { ProjectData } from "@/types/project";
import { latestYearRecord, latestYearWithSettlement } from "@/lib/project-helpers";
import { formatYen } from "@/lib/format";
import { SourcedText } from "../SourcedValue";
import { CitationBadge } from "../Citation";

/**
 * 市民モード:「このお金は、私たちの暮らしにどう役立っている?」
 * 通常表示: この事業は何か/誰のためか/いくらか/昨年度の成果/今年から始まること。専門用語(款項目コード等)は出さない。
 * 詳細モード: 詳しい説明、暮らしとの関わり、対象者、利用方法、財源のやさしい説明、過去の成果、今年の新しい取組、出典資料。
 */
export function CitizenMode({ data, detail }: { data: ProjectData; detail: boolean }) {
  const current = latestYearRecord(data);
  const withResults = latestYearWithSettlement(data);
  if (!current) {
    return <p className="text-sm text-slate-500">情報がありません。</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-pink-200 bg-pink-50/40 p-5">
        <h3 className="mb-2 text-base font-bold text-pink-900">この事業は何をするもの?</h3>
        <SourcedText label="事業の内容" field={current.overview ?? null} />
        <div className="mt-3">
          <SourcedText label="どんな人のための事業?" field={current.purpose ?? null} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-bold text-slate-700">今年度、いくら使う予定?</h3>
        <p className="text-2xl font-bold text-mode-citizen">
          {formatYen(current.budget?.initial.value ?? null)}
          <CitationBadge
            citation={current.budget?.initial.citation ?? null}
            confidence={current.budget?.initial.confidence ?? "高"}
          />
        </p>
      </section>

      {withResults && withResults.outputOutcome && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-700">
            昨年度({withResults.year}年度)の成果
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {withResults.outputOutcome.outputs.slice(0, 6).map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-2xl" aria-hidden>
                  📌
                </div>
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className="text-sm font-semibold text-slate-900">{m.value.value ?? "資料記載なし"}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {current.newInitiatives.length > 0 && (
        <section className="rounded-xl border-2 border-pink-300 bg-pink-50/60 p-5">
          <h3 className="mb-3 text-sm font-bold text-pink-900">今年から始まること</h3>
          <ul className="space-y-2">
            {current.newInitiatives.map((ni, i) => (
              <li key={i} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                <span className="font-semibold">{ni.name}</span>
                <p className="mt-1 text-slate-600">{ni.purpose.value ?? "資料記載なし"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail && (
        <section className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
          <h3 className="text-sm font-bold text-slate-700">くわしい情報</h3>
          <SourcedText label="くわしい説明" field={current.overview ?? null} />
          <SourcedText label="対象者" field={current.purpose ?? null} />
          <div>
            <span className="text-xs text-slate-500">利用方法・お問い合わせ</span>
            <p className="text-sm text-slate-400">資料記載なし(原典資料に利用方法・連絡先の記載はありません)</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">財源のご説明</span>
            <p className="mt-1 text-sm text-slate-700">
              この事業は、国や県からの補助金、市の基金、そして市民の皆さんの税金である一般財源などを組み合わせて実施されています。
            </p>
          </div>
          {withResults && (
            <div>
              <span className="text-xs text-slate-500">過去の成果(行政の評価)</span>
              <SourcedText label="評価" field={withResults.outputOutcome?.qualitativeOutcome ?? null} />
            </div>
          )}
          <div>
            <span className="text-xs text-slate-500">よくある質問</span>
            <p className="text-sm text-slate-400">資料記載なし</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">出典資料</span>
            <p className="text-sm text-slate-600">
              {current.overview?.citation?.sourceDocument ?? "資料記載なし"}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
