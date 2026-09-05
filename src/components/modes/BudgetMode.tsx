import type { FiscalYear, ProjectData } from "@/types/project";
import { findYearRecord, previousYearRecord } from "@/lib/project-helpers";
import { formatYen, growthRate } from "@/lib/format";
import { SectionCard } from "../ui/SectionCard";
import { KpiCard } from "../ui/KpiCard";
import { NewProjectCard } from "../ui/NewProjectCard";
import { FinanceDonutChart } from "../charts/FinanceDonutChart";
import { CitationBadge } from "../Citation";

/**
 * 予算モード:「これからの予算は妥当か?」
 * 通常表示: KPI(今年度予算/前年度予算/前年度決算/前年度執行率/前年度決算比)、
 * 主な事業内容、新規事業、財源内訳ドーナツ、期待される効果、注目の論点、関連情報。
 * 詳細モード: 積算内訳・費目別/財源別の増減理由。
 */
export function BudgetMode({
  data,
  detail,
  selectedYear,
}: {
  data: ProjectData;
  detail: boolean;
  selectedYear: FiscalYear;
}) {
  const current = findYearRecord(data, selectedYear);
  if (!current) {
    return <p className="text-sm text-slate-500">選択された年度の予算データがありません。</p>;
  }
  const prev = previousYearRecord(data, selectedYear);

  const budgetVsPrevSettlement = growthRate(
    current.budget?.initial.value ?? null,
    prev?.settlement?.amount.value ?? null
  );
  const totalDelta =
    current.budget?.final.value != null && prev?.budget?.final.value != null
      ? current.budget.final.value - prev.budget.final.value
      : null;

  const fundingSlices = current.funding
    ? [
        { label: "一般財源", value: current.funding.generalFund.value },
        { label: "国庫支出金", value: current.funding.nationalGrant.value },
        { label: "県支出金", value: current.funding.prefecturalGrant.value },
        { label: "市債", value: current.funding.municipalBond.value },
        { label: "基金", value: current.funding.fund.value },
        { label: "その他", value: current.funding.other.value },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <KpiCard label={`${current.year}年度予算`} field={current.budget?.initial ?? null} accentClassName="text-mode-budget" />
        <KpiCard label={`${prev?.year ?? "前年度"}予算`} field={prev?.budget?.final ?? null} />
        <KpiCard label={`${prev?.year ?? "前年度"}決算`} field={prev?.settlement?.amount ?? null} />
        <KpiCard
          label={`${prev?.year ?? "前年度"}執行率`}
          field={prev?.settlement?.executionRate ?? null}
          unit="percent"
        />
        <KpiCard
          label="前年度決算比"
          field={current.budget?.initial ?? null}
          changePercent={budgetVsPrevSettlement}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="主な事業内容(メイン事業)" className="lg:col-span-2">
          {current.implementation && current.implementation.mainSubProjects.length > 0 ? (
            <ol className="space-y-2">
              {current.implementation.mainSubProjects.map((sp, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mode-budget/10 text-xs font-bold text-mode-budget">
                    {i + 1}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
                    {sp.value ?? "資料記載なし"}
                    <CitationBadge citation={sp.citation} confidence={sp.confidence} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">資料記載なし</p>
          )}
        </SectionCard>

        <SectionCard title="財源内訳">
          <FinanceDonutChart data={fundingSlices} />
        </SectionCard>
      </div>

      {current.newInitiatives.length > 0 && (
        <SectionCard title="新規事業">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {current.newInitiatives.map((ni, i) => (
              <NewProjectCard key={i} item={ni} />
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="前年度からの主な増減">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">全体(最終予算ベース)</span>
            <span className={`font-semibold ${totalDelta !== null && totalDelta > 0 ? "text-rose-600" : "text-blue-600"}`}>
              {totalDelta !== null ? `${totalDelta > 0 ? "+" : ""}${formatYen(totalDelta)}` : "算出不可"}
            </span>
          </div>
          {current.newInitiatives.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {current.newInitiatives.map((ni, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-pink-50/60 px-3 py-2">
                  <span className="text-slate-600">新規: {ni.name}</span>
                  <span className="font-semibold text-pink-700">+{formatYen(ni.budget.value)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">
            ※ 事業別の内訳金額は原典が自由記述のため、機械的な差分計算はできません(全体増減のみ算出)。
          </p>
        </SectionCard>

        <SectionCard title="期待される効果">
          {current.newInitiatives.some((ni) => ni.expectedOutcome.value) ? (
            <ul className="space-y-1.5 text-sm text-slate-700">
              {current.newInitiatives
                .filter((ni) => ni.expectedOutcome.value)
                .map((ni, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-emerald-600">
                      ✓
                    </span>
                    {ni.expectedOutcome.value}
                    <CitationBadge citation={ni.expectedOutcome.citation} confidence={ni.expectedOutcome.confidence} />
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">資料記載なし</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="注目の論点" className="border-mode-budget/30 bg-blue-50/20">
        <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
          <li>前年度の未執行を踏まえた予算額になっているか</li>
          <li>新規事業の目標と効果測定方法は明確か</li>
          <li>一般財源負担に見合う成果が見込めるか</li>
          <li>国・県の制度を十分活用できているか</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          ※ これは資料から抽出した事実ではなく、審査の着眼点として一般的に有用な論点の提示です。
        </p>
      </SectionCard>

      <SectionCard title="関連情報">
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {["過去の予算・決算推移", "前年度成果説明書", "総合戦略との関係", "類似自治体との比較"].map((label) => (
            <li key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-400">
              {label}
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px]">準備中</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {detail && (
        <SectionCard title="詳細モード: 予算内訳" className="border-slate-300 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBlock label="当初予算" value={current.budget?.initial.value ?? null} />
            <StatBlock label="補正予算" value={current.budget?.supplementary.value ?? null} />
            <StatBlock label="最終予算" value={current.budget?.final.value ?? null} />
            <StatBlock label="前年度予算" value={current.budget?.previousYear.value ?? null} />
          </div>
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold text-slate-600">新規・拡充理由の記載</h4>
            {current.newInitiatives.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {current.newInitiatives.map((ni, i) => (
                  <li key={i}>
                    <span className="font-semibold">{ni.name}</span>: {ni.purpose.value ?? "資料記載なし"}
                    <CitationBadge citation={ni.purpose.citation} confidence={ni.purpose.confidence} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">資料記載なし</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{formatYen(value)}</p>
    </div>
  );
}
