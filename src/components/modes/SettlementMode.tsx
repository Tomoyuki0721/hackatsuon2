import type { ProjectData, Sourced } from "@/types/project";
import { latestYearWithSettlement, previousYearRecord } from "@/lib/project-helpers";
import { formatPercent, formatYen, unitCost } from "@/lib/format";
import { SourcedText, SourcedYen } from "../SourcedValue";
import { CitationBadge } from "../Citation";

/**
 * 決算モード:「使ったお金で、どんな成果が出たか?」
 * 通常表示: 当初→最終→決算→不用額→執行率のフロー、INPUT→OUTPUT→OUTCOME→ISSUEのフロー、
 * 主な成果カード、行政の評価・成果と行政記載の課題を分けて表示。
 * 詳細モード: 財源別内訳、事業別決算額、活動・成果指標、KPI達成率、自動計算単価(注記付き)。
 */
export function SettlementMode({ data, detail }: { data: ProjectData; detail: boolean }) {
  const current = latestYearWithSettlement(data);
  if (!current || !current.settlement) {
    return <p className="text-sm text-slate-500">決算データがありません。</p>;
  }
  const prev = previousYearRecord(data, current.year);
  const execRate = current.settlement.executionRate.value;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">{current.year}年度 予算執行の流れ</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FlowBox label="当初予算" field={current.budget?.initial ?? null} />
          <Arrow />
          <FlowBox label="最終予算" field={current.budget?.final ?? null} />
          <Arrow />
          <FlowBox label="決算額" field={current.settlement.amount} highlight="settlement" />
          <Arrow />
          <FlowBox label="不用額" field={current.settlement.unspent} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">執行率</span>
          <span className="text-lg font-bold text-mode-settlement">
            {execRate !== null ? `${execRate.toFixed(1)}%` : "算出不可"}
          </span>
          <CitationBadge
            citation={current.settlement.executionRate.citation}
            confidence={current.settlement.executionRate.confidence}
          />
          {execRate !== null && execRate < 85 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <span aria-hidden>▲</span>執行率が低い
            </span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">主な成果</h3>
        {current.outputOutcome && current.outputOutcome.outputs.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {current.outputOutcome.outputs.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                  {m.value.value ?? "資料記載なし"}
                  <CitationBadge citation={m.value.citation} confidence={m.value.confidence} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">資料記載なし</p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h3 className="mb-2 text-sm font-bold text-emerald-800">行政の評価・成果</h3>
          <SourcedText label="定性的な成果" field={current.outputOutcome?.qualitativeOutcome ?? null} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-2 text-sm font-bold text-amber-800">行政が記載した課題</h3>
          <SourcedText label="課題" field={current.issuesAndResponse?.issue ?? null} />
        </div>
      </section>

      {detail && (
        <section className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
          <h3 className="text-sm font-bold text-slate-700">詳細モード: 財源別決算・事業別内訳</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SourcedYen label="国庫支出金" field={current.funding?.nationalGrant ?? null} />
            <SourcedYen label="県支出金" field={current.funding?.prefecturalGrant ?? null} />
            <SourcedYen label="市債" field={current.funding?.municipalBond ?? null} />
            <SourcedYen label="基金" field={current.funding?.fund ?? null} />
            <SourcedYen label="その他" field={current.funding?.other ?? null} />
            <SourcedYen label="一般財源" field={current.funding?.generalFund ?? null} />
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">事業別 決算関連額</h4>
            {current.implementation && current.implementation.mainSubProjects.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {current.implementation.mainSubProjects.map((sp, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span>{sp.value ?? "資料記載なし"}</span>
                    <CitationBadge citation={sp.citation} confidence={sp.confidence} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">資料記載なし</p>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">活動・成果指標</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[...(current.outputOutcome?.outputs ?? []), ...(current.outputOutcome?.outcomes ?? [])].map(
                (m, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    <span className="text-slate-600">{m.label}</span>
                    <span className="flex items-center gap-1 font-medium">
                      {m.value.value ?? "資料記載なし"}
                      <CitationBadge citation={m.value.citation} confidence={m.value.confidence} />
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-slate-600">KPI達成率</span>
              <span className="font-semibold">
                {formatPercent(current.outputOutcome?.kpiAchievementRate?.value ?? null)}
              </span>
            </div>
          </div>

          <UnitCostBox
            label="移住者1人あたりの決算コスト(一般財源ベース)"
            amount={current.funding?.generalFund.value ?? null}
            count={extractFirstNumber(current.outputOutcome, "移住者")}
          />
        </section>
      )}
    </div>
  );
}

function FlowBox({
  label,
  field,
  highlight,
}: {
  label: string;
  field: Sourced<number> | null;
  highlight?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? "border-mode-settlement bg-green-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
        {formatYen(field?.value ?? null)}
        <CitationBadge citation={field?.citation ?? null} confidence={field?.confidence ?? "高"} />
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <span className="text-slate-400" aria-hidden>
      →
    </span>
  );
}

function extractFirstNumber(
  outputOutcome: ProjectData["years"][number]["outputOutcome"],
  labelIncludes: string
): number | null {
  const entry = outputOutcome?.outputs.find((m) => m.label.includes(labelIncludes));
  return entry?.numericValue ?? null;
}

function UnitCostBox({
  label,
  amount,
  count,
}: {
  label: string;
  amount: number | null;
  count: number | null;
}) {
  const cost = unitCost(amount, count);
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-3">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="text-base font-bold text-slate-900">
        {cost !== null ? formatYen(cost) : "算出不可"}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        ※ この単価はAIによる自動計算であり、原典に記載された数値ではありません。また、この単価だけでは事業全体の費用対効果を判断できません(相談・広報等の波及効果は含まれていません)。
      </p>
    </div>
  );
}
