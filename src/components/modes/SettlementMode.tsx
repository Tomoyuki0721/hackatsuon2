"use client";

import { useState } from "react";
import type { FiscalYear, ProjectData, ProjectYearRecord } from "@/types/project";
import { findYearRecord, latestYearWithSettlement, previousYearRecord } from "@/lib/project-helpers";
import { formatPercent, formatYen, unitCost } from "@/lib/format";
import { SectionCard } from "../ui/SectionCard";
import { KpiCard } from "../ui/KpiCard";
import { OutcomeCard } from "../ui/OutcomeCard";
import { IssueCard } from "../ui/IssueCard";
import { DetailTabs } from "../ui/DetailTabs";
import { ExecutionGauge } from "../charts/ExecutionGauge";
import { FundingBarChart } from "../charts/FundingBarChart";
import { CitationBadge } from "../Citation";

const TABS = ["執行状況", "実施内容", "成果・評価", "課題", "費用対効果"] as const;
type Tab = (typeof TABS)[number];

/**
 * 決算モード:「使ったお金で、どんな成果が出たか?」
 * 通常表示: KPI(当初/最終/決算/不用額/執行率)+円形ゲージ、財源別決算額、OUTPUT/OUTCOME、
 * 行政の評価と課題、決算審査の論点。
 * 詳細モード: ［執行状況］［実施内容］［成果・評価］［課題］［費用対効果］のタブ。
 */
export function SettlementMode({
  data,
  detail,
  selectedYear,
}: {
  data: ProjectData;
  detail: boolean;
  selectedYear: FiscalYear;
}) {
  const [tab, setTab] = useState<Tab>("執行状況");

  // 選択年度に決算が無い場合(R8など将来年度)は、決算のある直近年度に自動的に切り替える
  const selected = findYearRecord(data, selectedYear);
  const current = selected?.settlement ? selected : latestYearWithSettlement(data);
  const fellBack = current !== null && current.year !== selectedYear;

  if (!current || !current.settlement) {
    return <p className="text-sm text-slate-500">決算データがありません。</p>;
  }

  const settlement = current.settlement;
  const execRate = settlement.executionRate.value;
  const prev = previousYearRecord(data, current.year);

  const fundingBars = current.funding
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
      {fellBack && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span aria-hidden>▲</span> {selectedYear}年度の決算はまだ資料がないため、決算が確定している{current.year}
          年度を表示しています。
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <KpiCard label="当初予算" field={current.budget?.initial ?? null} />
        <KpiCard label="最終予算" field={current.budget?.final ?? null} />
        <KpiCard label="決算額" field={settlement.amount} accentClassName="text-mode-settlement" />
        <KpiCard label="不用額" field={settlement.unspent} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title={`${current.year}年度 執行率`}>
          <div className="flex items-center justify-center">
            <ExecutionGauge rate={execRate} />
          </div>
          <div className="mt-2 text-center">
            <CitationBadge
              citation={settlement.executionRate.citation}
              confidence={settlement.executionRate.confidence}
            />
          </div>
        </SectionCard>

        <SectionCard title="財源ごとの決算額" className="lg:col-span-2">
          <FundingBarChart data={fundingBars} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="主な実施実績(OUTPUT)" className="lg:col-span-2">
          {current.outputOutcome && current.outputOutcome.outputs.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {current.outputOutcome.outputs.map((m, i) => (
                <OutcomeCard key={i} metric={m} kind="output" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">資料記載なし</p>
          )}
        </SectionCard>

        <SectionCard title="主な成果(OUTCOME)">
          {current.outputOutcome && current.outputOutcome.outcomes.length > 0 ? (
            <div className="space-y-3">
              {current.outputOutcome.outcomes.map((m, i) => (
                <OutcomeCard key={i} metric={m} kind="outcome" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">資料記載なし</p>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IssueCard
          title="行政の評価・成果"
          field={current.outputOutcome?.qualitativeOutcome ?? null}
          variant="evaluation"
        />
        <IssueCard title="今後の課題" field={current.issuesAndResponse?.issue ?? null} variant="issue" />
      </div>

      <SectionCard title="決算審査の論点" className="border-mode-settlement/30 bg-green-50/20">
        <ol className="space-y-2 text-sm text-slate-700">
          <li className="flex gap-2">
            <Num n={1} />
            不用額{formatYen(settlement.unspent.value)}が生じた理由は何か
          </li>
          <li className="flex gap-2">
            <Num n={2} />
            成果指標に対して、費やした費用は見合っているか(詳細モードの［費用対効果］参照)
          </li>
          <li className="flex gap-2">
            <Num n={3} />
            行政が記載した課題は、次年度予算にどう反映されるのか
          </li>
        </ol>
        <p className="mt-2 text-xs text-slate-400">
          ※ 論点は審査の着眼点として提示するもので、資料に記載された事実ではありません。
        </p>
      </SectionCard>

      {detail && (
        <SectionCard title="詳細モード" className="border-slate-300 bg-slate-50">
          <DetailTabs tabs={TABS} active={tab} onChange={setTab} mode="settlement" />

          {tab === "執行状況" && <ExecutionTab current={current} prev={prev} />}
          {tab === "実施内容" && <ImplementationTab current={current} />}
          {tab === "成果・評価" && <OutcomeTab current={current} />}
          {tab === "課題" && <IssueTab current={current} />}
          {tab === "費用対効果" && <CostEffectTab current={current} />}
        </SectionCard>
      )}
    </div>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mode-settlement/15 text-xs font-bold text-mode-settlement">
      {n}
    </span>
  );
}

function ExecutionTab({ current, prev }: { current: ProjectYearRecord; prev: ProjectYearRecord | null }) {
  const rows: { label: string; value: number | null }[] = [
    { label: "当初予算", value: current.budget?.initial.value ?? null },
    { label: "補正予算", value: current.budget?.supplementary.value ?? null },
    { label: "最終予算(予算現額)", value: current.budget?.final.value ?? null },
    { label: "決算額", value: current.settlement?.amount.value ?? null },
    { label: "不用額", value: current.settlement?.unspent.value ?? null },
  ];

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-200 last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
                {r.label}
              </th>
              <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                {formatYen(r.value)}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
              執行率
            </th>
            <td className="py-2 text-right font-semibold text-slate-900">
              {formatPercent(current.settlement?.executionRate.value ?? null)}
            </td>
          </tr>
        </tbody>
      </table>

      {prev && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-slate-500">前年度({prev.year})との比較</p>
          <div className="flex justify-between">
            <span className="text-slate-600">決算額</span>
            <span className="tabular-nums">
              {formatYen(prev.settlement?.amount.value ?? null)} → {formatYen(current.settlement?.amount.value ?? null)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">執行率</span>
            <span className="tabular-nums">
              {formatPercent(prev.settlement?.executionRate.value ?? null)} →{" "}
              {formatPercent(current.settlement?.executionRate.value ?? null)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ImplementationTab({ current }: { current: ProjectYearRecord }) {
  const impl = current.implementation;
  if (!impl) return <p className="text-sm text-slate-500">資料記載なし</p>;

  const groups = [
    { title: "メイン事業", items: impl.mainSubProjects },
    { title: "新規事業", items: impl.newSubProjects },
    { title: "拡充事業", items: impl.expandedSubProjects },
    { title: "廃止事業", items: impl.discontinuedSubProjects },
  ];

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.title}>
          <h4 className="mb-1.5 text-xs font-semibold text-slate-600">{g.title}</h4>
          {g.items.length > 0 ? (
            <ul className="space-y-1.5">
              {g.items.map((it, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm">
                  {it.value ?? "資料記載なし"}
                  <CitationBadge citation={it.citation} confidence={it.confidence} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">資料記載なし</p>
          )}
        </div>
      ))}
    </div>
  );
}

function OutcomeTab({ current }: { current: ProjectYearRecord }) {
  const oo = current.outputOutcome;
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold text-slate-600">活動指標(OUTPUT)</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(oo?.outputs ?? []).map((m, i) => (
            <OutcomeCard key={i} metric={m} kind="output" />
          ))}
          {(oo?.outputs ?? []).length === 0 && <p className="text-sm text-slate-400">資料記載なし</p>}
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold text-slate-600">成果指標(OUTCOME)</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(oo?.outcomes ?? []).map((m, i) => (
            <OutcomeCard key={i} metric={m} kind="outcome" />
          ))}
          {(oo?.outcomes ?? []).length === 0 && <p className="text-sm text-slate-400">資料記載なし</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">KPI達成率</span>
        <span className="font-semibold">{formatPercent(oo?.kpiAchievementRate?.value ?? null)}</span>
        {oo?.kpiAchievementRate == null && (
          <span className="text-xs text-slate-400">(目標値が資料に記載されていないため算出不可)</span>
        )}
      </div>
      <IssueCard title="行政の評価・成果" field={oo?.qualitativeOutcome ?? null} variant="evaluation" />
    </div>
  );
}

function IssueTab({ current }: { current: ProjectYearRecord }) {
  return (
    <div className="space-y-4">
      <IssueCard title="行政が記載した課題" field={current.issuesAndResponse?.issue ?? null} variant="issue" />
      <IssueCard
        title="翌年度への対応"
        field={current.issuesAndResponse?.nextYearResponse ?? null}
        variant="response"
      />
    </div>
  );
}

function CostEffectTab({ current }: { current: ProjectYearRecord }) {
  const settlementAmount = current.settlement?.amount.value ?? null;
  const generalFund = current.funding?.generalFund.value ?? null;
  const oo = current.outputOutcome;

  const units = [
    ...(oo?.outcomes ?? []).map((m) => ({
      label: `${m.label} 1件・1人あたり(決算額ベース)`,
      value: unitCost(settlementAmount, m.numericValue ?? null),
    })),
    ...(oo?.outcomes ?? []).map((m) => ({
      label: `${m.label} 1件・1人あたり(一般財源ベース)`,
      value: unitCost(generalFund, m.numericValue ?? null),
    })),
    ...(oo?.outputs ?? []).slice(0, 2).map((m) => ({
      label: `${m.label} 1件あたり(決算額ベース)`,
      value: unitCost(settlementAmount, m.numericValue ?? null),
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {units.map((u, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">{u.label}</p>
            <p className="text-base font-bold text-slate-900">
              {u.value !== null ? formatYen(u.value) : "算出不可"}
            </p>
          </div>
        ))}
        {units.length === 0 && <p className="text-sm text-slate-400">算出可能な指標がありません。</p>}
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <span aria-hidden>▲</span>{" "}
        これらの単価は本システムが決算額・一般財源額を各指標の数値で機械的に割ったものであり、原典に記載された数値ではありません。
        <strong>この単価だけでは事業全体の費用対効果は判断できません。</strong>
        相談対応・広報・空き家掘り起こしなど、単一の指標に表れない活動も同じ予算に含まれているためです。
      </p>
    </div>
  );
}
