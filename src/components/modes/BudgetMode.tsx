import type { ProjectData } from "@/types/project";
import { latestYearRecord, previousYearRecord } from "@/lib/project-helpers";
import { formatSignedPercent, formatYen, growthRate } from "@/lib/format";
import { SourcedText, SourcedYen } from "../SourcedValue";
import { NewInitiativeCard } from "../NewInitiativeCard";
import { CitationBadge } from "../Citation";

/**
 * 予算モード:「これからの予算は妥当か?」
 * 通常表示: 今年度/前年度予算、前年度決算・執行率、前年比、財源構成、主な事業、新規事業、前年度課題、審査ポイント。
 * 詳細モード: 積算根拠、内訳、財源内訳、一般財源負担、前年度実績との比較、課題反映有無、論点。
 */
export function BudgetMode({ data, detail }: { data: ProjectData; detail: boolean }) {
  const current = latestYearRecord(data);
  if (!current) {
    return <p className="text-sm text-slate-500">予算データがありません。</p>;
  }
  const prev = previousYearRecord(data, current.year);

  const budgetGrowth = growthRate(
    current.budget?.final.value ?? null,
    prev?.budget?.final.value ?? null
  );
  const execRatePrev =
    prev?.settlement && prev.budget
      ? (prev.settlement.executionRate.value ?? null)
      : null;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <SourcedYen label={`${current.year}年度 当初予算`} field={current.budget?.initial ?? null} />
        <SourcedYen
          label={`${prev?.year ?? "前年度"} 予算(最終)`}
          field={prev?.budget?.final ?? null}
        />
        <SourcedYen label={`${prev?.year ?? "前年度"} 決算額`} field={prev?.settlement?.amount ?? null} />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">前年度執行率</span>
          <span className="text-base font-semibold text-slate-900">
            {execRatePrev !== null ? `${execRatePrev.toFixed(1)}%` : "算出不可"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">前年比(当初予算)</span>
          <span
            className={`text-base font-semibold ${
              budgetGrowth !== null && budgetGrowth > 0 ? "text-mode-budget" : "text-slate-900"
            }`}
          >
            {formatSignedPercent(budgetGrowth)}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">財源構成</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SourcedYen label="国庫支出金" field={current.funding?.nationalGrant ?? null} />
          <SourcedYen label="県支出金" field={current.funding?.prefecturalGrant ?? null} />
          <SourcedYen label="市債" field={current.funding?.municipalBond ?? null} />
          <SourcedYen label="基金" field={current.funding?.fund ?? null} />
          <SourcedYen label="その他" field={current.funding?.other ?? null} />
          <SourcedYen label="一般財源" field={current.funding?.generalFund ?? null} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">主な事業内容</h3>
        {current.implementation && current.implementation.mainSubProjects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {current.implementation.mainSubProjects.map((sp, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span>{sp.value ?? "資料記載なし"}</span>
                <CitationBadge citation={sp.citation} confidence={sp.confidence} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">資料記載なし</p>
        )}
      </section>

      {current.newInitiatives.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold text-slate-700">新規事業</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {current.newInitiatives.map((ni, i) => (
              <NewInitiativeCard key={i} item={ni} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">前年度の課題</h3>
        <SourcedText label={`${prev?.year ?? "前年度"}の課題`} field={prev?.issuesAndResponse?.issue ?? null} />
      </section>

      <section className="rounded-xl border-2 border-dashed border-mode-budget/50 bg-blue-50/30 p-5">
        <h3 className="mb-2 text-sm font-bold text-mode-budget">予算審査で注目すべきポイント</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>この金額の根拠は何か(積算内訳は詳細モードで確認)</li>
          <li>前年度の不用額を踏まえた予算組みになっているか</li>
          <li>前年度の成果・課題を踏まえた内容になっているか</li>
          <li>一般財源負担の大きさは妥当か</li>
          <li>自己申告された課題への対応が予算に反映されているか</li>
        </ul>
      </section>

      {detail && (
        <section className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
          <h3 className="text-sm font-bold text-slate-700">詳細モード: 予算内訳</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SourcedYen label="当初予算" field={current.budget?.initial ?? null} />
            <SourcedYen label="補正予算" field={current.budget?.supplementary ?? null} />
            <SourcedYen label="最終予算" field={current.budget?.final ?? null} />
            <SourcedYen label="前年度予算" field={current.budget?.previousYear ?? null} />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">新規・拡充理由の記載</h4>
            {current.newInitiatives.length > 0 ? (
              <ul className="space-y-2">
                {current.newInitiatives.map((ni, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    <span className="font-semibold">{ni.name}</span>: {ni.purpose.value ?? "資料記載なし"}
                    <CitationBadge citation={ni.purpose.citation} confidence={ni.purpose.confidence} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">資料記載なし</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
