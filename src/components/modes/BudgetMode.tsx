"use client";

import { useState } from "react";
import type { FiscalYear, ProjectData, ProjectYearRecord } from "@/types/project";
import { findYearRecord, previousYearRecord } from "@/lib/project-helpers";
import { formatPercent, formatSignedPercent, formatYen, growthRate } from "@/lib/format";
import { SectionCard } from "../ui/SectionCard";
import { KpiCard } from "../ui/KpiCard";
import { NewProjectCard } from "../ui/NewProjectCard";
import { IssueCard } from "../ui/IssueCard";
import { DetailTabs } from "../ui/DetailTabs";
import { FinanceDonutChart } from "../charts/FinanceDonutChart";
import { CitationBadge } from "../Citation";

const TABS = ["事業内容", "積算内訳", "財源内訳", "前年度比較", "成果との整合"] as const;
type Tab = (typeof TABS)[number];

function fundingSlicesOf(record: ProjectYearRecord) {
  return record.funding
    ? [
        { label: "一般財源", value: record.funding.generalFund.value },
        { label: "国庫支出金", value: record.funding.nationalGrant.value },
        { label: "県支出金", value: record.funding.prefecturalGrant.value },
        { label: "市債", value: record.funding.municipalBond.value },
        { label: "基金", value: record.funding.fund.value },
        { label: "その他", value: record.funding.other.value },
      ]
    : [];
}

/**
 * 予算モード:「これからの予算は妥当か?」
 * 通常表示: KPI・主な事業内容・新規事業・財源内訳・増減・期待される効果・論点・関連情報。
 * 詳細モード: ［事業内容］［積算内訳］［財源内訳］［前年度比較］［成果との整合］のタブ。
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
  const [tab, setTab] = useState<Tab>("事業内容");

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <KpiCard
          label={`${current.year}年度予算`}
          field={current.budget?.initial ?? null}
          accentClassName="text-mode-budget"
        />
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
          <FinanceDonutChart data={fundingSlicesOf(current)} />
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
            <span
              className={`font-semibold ${totalDelta !== null && totalDelta > 0 ? "text-rose-600" : "text-blue-600"}`}
            >
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
                    <CitationBadge
                      citation={ni.expectedOutcome.citation}
                      confidence={ni.expectedOutcome.confidence}
                    />
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
          <li>
            前年度の不用額({formatYen(prev?.settlement?.unspent.value ?? null)})を踏まえた予算額になっているか
          </li>
          <li>新規事業の目標と効果測定方法は明確か</li>
          <li>
            一般財源負担({formatYen(current.funding?.generalFund.value ?? null)})に見合う成果が見込めるか
          </li>
          <li>国・県の制度を十分活用できているか</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          ※ 論点は審査の着眼点として提示するもので、資料に記載された事実ではありません(金額は原典に基づきます)。
        </p>
      </SectionCard>

      <SectionCard title="関連情報">
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {["過去の予算・決算推移", "前年度成果説明書", "総合戦略との関係", "類似自治体との比較"].map(
            (label) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-400"
              >
                {label}
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px]">準備中</span>
              </li>
            )
          )}
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          ※ 「過去の予算・決算推移」は一般質問モードで確認できます。
        </p>
      </SectionCard>

      {detail && (
        <SectionCard title="詳細モード" className="border-slate-300 bg-slate-50">
          <DetailTabs tabs={TABS} active={tab} onChange={setTab} mode="budget" />

          {tab === "事業内容" && <ContentTab current={current} />}
          {tab === "積算内訳" && <BreakdownTab current={current} />}
          {tab === "財源内訳" && <FundingTab current={current} />}
          {tab === "前年度比較" && <CompareTab current={current} prev={prev} />}
          {tab === "成果との整合" && <AlignmentTab current={current} prev={prev} />}
        </SectionCard>
      )}
    </div>
  );
}

function ContentTab({ current }: { current: ProjectYearRecord }) {
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

function BreakdownTab({ current }: { current: ProjectYearRecord }) {
  const rows = [
    { label: "当初予算", field: current.budget?.initial ?? null },
    { label: "補正予算", field: current.budget?.supplementary ?? null },
    { label: "最終予算", field: current.budget?.final ?? null },
    { label: "前年度予算", field: current.budget?.previousYear ?? null },
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
                {formatYen(r.field?.value ?? null)}
              </td>
              <td className="w-8 py-2 text-right">
                <CitationBadge citation={r.field?.citation ?? null} confidence={r.field?.confidence ?? "高"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">事業別の内訳(原典の記載どおり)</h4>
        {(current.implementation?.mainSubProjects ?? []).length > 0 ? (
          <ul className="space-y-1.5">
            {(current.implementation?.mainSubProjects ?? []).map((sp, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm">
                {sp.value ?? "資料記載なし"}
                <CitationBadge citation={sp.citation} confidence={sp.confidence} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">資料記載なし</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          ※ 費目別(需用費・委託料等)の積算根拠は、予算説明資料に事業単位での記載がないため取得できていません。
        </p>
      </div>
    </div>
  );
}

function FundingTab({ current }: { current: ProjectYearRecord }) {
  const f = current.funding;
  if (!f) return <p className="text-sm text-slate-500">資料記載なし</p>;

  const rows = [
    { label: "国庫支出金", field: f.nationalGrant },
    { label: "県支出金", field: f.prefecturalGrant },
    { label: "市債", field: f.municipalBond },
    { label: "基金", field: f.fund },
    { label: "その他", field: f.other },
    { label: "一般財源", field: f.generalFund },
  ];

  const total = rows.reduce((sum, r) => sum + (r.field.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <FinanceDonutChart data={fundingSlicesOf(current)} />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4">財源</th>
            <th className="py-2 pr-4 text-right">金額</th>
            <th className="py-2 pr-4 text-right">構成比</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-100">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
                {r.label}
              </th>
              <td className="py-2 pr-4 text-right tabular-nums">{formatYen(r.field.value)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                {r.field.value !== null && total > 0
                  ? formatPercent((r.field.value / total) * 100)
                  : "算出不可"}
              </td>
              <td className="py-2 text-right">
                <CitationBadge citation={r.field.citation} confidence={r.field.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400">
        一般財源負担額: <strong className="text-slate-700">{formatYen(f.generalFund.value)}</strong>
      </p>
    </div>
  );
}

function CompareTab({ current, prev }: { current: ProjectYearRecord; prev: ProjectYearRecord | null }) {
  if (!prev) return <p className="text-sm text-slate-500">比較できる前年度のデータがありません。</p>;

  const budgetDelta =
    current.budget?.final.value != null && prev.budget?.final.value != null
      ? current.budget.final.value - prev.budget.final.value
      : null;
  const budgetRate = growthRate(current.budget?.final.value ?? null, prev.budget?.final.value ?? null);
  const vsSettlementDelta =
    current.budget?.initial.value != null && prev.settlement?.amount.value != null
      ? current.budget.initial.value - prev.settlement.amount.value
      : null;
  const vsSettlementRate = growthRate(
    current.budget?.initial.value ?? null,
    prev.settlement?.amount.value ?? null
  );

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4">項目</th>
            <th className="py-2 pr-4 text-right">{prev.year}年度</th>
            <th className="py-2 pr-4 text-right">{current.year}年度</th>
            <th className="py-2 pr-4 text-right">増減</th>
            <th className="py-2 text-right">増減率</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
              予算(最終)
            </th>
            <td className="py-2 pr-4 text-right tabular-nums">{formatYen(prev.budget?.final.value ?? null)}</td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatYen(current.budget?.final.value ?? null)}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {budgetDelta !== null ? `${budgetDelta > 0 ? "+" : ""}${formatYen(budgetDelta)}` : "算出不可"}
            </td>
            <td className="py-2 text-right tabular-nums">{formatSignedPercent(budgetRate)}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
              前年度決算との比較
            </th>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatYen(prev.settlement?.amount.value ?? null)}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatYen(current.budget?.initial.value ?? null)}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {vsSettlementDelta !== null
                ? `${vsSettlementDelta > 0 ? "+" : ""}${formatYen(vsSettlementDelta)}`
                : "算出不可"}
            </td>
            <td className="py-2 text-right tabular-nums">{formatSignedPercent(vsSettlementRate)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
              一般財源
            </th>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatYen(prev.funding?.generalFund.value ?? null)}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatYen(current.funding?.generalFund.value ?? null)}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {current.funding?.generalFund.value != null && prev.funding?.generalFund.value != null
                ? `${current.funding.generalFund.value - prev.funding.generalFund.value > 0 ? "+" : ""}${formatYen(
                    current.funding.generalFund.value - prev.funding.generalFund.value
                  )}`
                : "算出不可"}
            </td>
            <td className="py-2 text-right tabular-nums">
              {formatSignedPercent(
                growthRate(current.funding?.generalFund.value ?? null, prev.funding?.generalFund.value ?? null)
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="mb-1 text-xs font-semibold text-slate-500">何が増減の要因か</p>
        {current.newInitiatives.length > 0 ? (
          <ul className="space-y-1">
            {current.newInitiatives.map((ni, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-slate-600">新規: {ni.name}</span>
                <span className="font-semibold text-pink-700">+{formatYen(ni.budget.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">新規事業の記載はありません。</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          ※ 事業別の増減は、原典に事業単位の前年度対比額の記載がないため、新規事業分のみ機械的に特定できます。
        </p>
      </div>
    </div>
  );
}

function AlignmentTab({ current, prev }: { current: ProjectYearRecord; prev: ProjectYearRecord | null }) {
  return (
    <div className="space-y-4">
      <IssueCard
        title={`${prev?.year ?? "前年度"}に行政が挙げた課題`}
        field={prev?.issuesAndResponse?.issue ?? null}
        variant="issue"
      />
      <IssueCard
        title={`${prev?.year ?? "前年度"}時点で示された翌年度への対応`}
        field={prev?.issuesAndResponse?.nextYearResponse ?? null}
        variant="response"
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-bold text-slate-700">
          {current.year}年度予算で新たに措置された内容
        </h4>
        {current.newInitiatives.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {current.newInitiatives.map((ni, i) => (
              <li key={i}>
                <span className="font-semibold text-slate-800">{ni.name}</span>
                <span className="ml-1 text-slate-600">{ni.purpose.value ?? "資料記載なし"}</span>
                <CitationBadge citation={ni.purpose.citation} confidence={ni.purpose.confidence} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">資料記載なし</p>
        )}
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <span aria-hidden>▲</span> 上記の課題と新規事業の対応関係は、原典に「この課題に対応するため」と
          明記されているわけではありません。両者が実際に対応しているかどうかは、
          <strong>担当課への確認が必要です</strong>(このサイトでは推測して結び付けていません)。
        </p>
      </div>
    </div>
  );
}
