"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ProjectData, ProjectYearRecord } from "@/types/project";
import {
  sortedYears,
  latestYearWithSettlement,
  resolveExecutionRate,
  resolveUnspent,
} from "@/lib/project-helpers";
import { formatPercent, formatYen } from "@/lib/format";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import { IssueCard } from "../ui/IssueCard";
import { DetailTabs } from "../ui/DetailTabs";
import { BudgetSettlementChart } from "../BudgetSettlementChart";
import { MetricTrendChart } from "../charts/MetricTrendChart";
import { CitationBadge } from "../Citation";

const TABS = ["時系列分析", "課題と対応", "過去答弁", "政策指標", "質問案"] as const;
type Tab = (typeof TABS)[number];

const RANGES = [3, 5, 10] as const;
type Range = (typeof RANGES)[number];

/**
 * 一般質問モード:「この政策はどこへ向かっているのか?」
 * 通常表示: 期間切替、予算・決算推移、成果指標推移、政策の流れ(課題→翌年度対応)、
 * 過去の一般質問・答弁、注目論点、質問案。
 * 詳細モード: ［時系列分析］［課題と対応］［過去答弁］［政策指標］［質問案］のタブ。
 */
export function QuestionMode({ data, detail }: { data: ProjectData; detail: boolean }) {
  const [tab, setTab] = useState<Tab>("時系列分析");
  const [range, setRange] = useState<Range>(5);

  const all = sortedYears(data);
  const years = all.slice(Math.max(0, all.length - range));

  const trendData = years.map((y) => ({
    year: y.year,
    budget: y.budget?.final.value ?? null,
    settlement: y.settlement?.amount.value ?? null,
  }));

  // 成果指標(OUTCOME)の推移。指標名は年度をまたいで同じラベルのものを追跡する。
  const outcomeLabels = Array.from(
    new Set(years.flatMap((y) => (y.outputOutcome?.outcomes ?? []).map((m) => m.label)))
  );
  const primaryLabel = outcomeLabels[0] ?? null;
  const metricPoints = primaryLabel
    ? years.map((y) => ({
        year: y.year,
        value:
          (y.outputOutcome?.outcomes ?? []).find((m) => m.label === primaryLabel)?.numericValue ?? null,
      }))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">表示期間</span>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              range === r
                ? "bg-mode-question text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r}年間
          </button>
        ))}
        <span className="text-xs text-slate-400">
          (資料が存在する年度のみ表示。令和5年度は資料が無いため欠落しています)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="予算・決算の推移">
          <BudgetSettlementChart data={trendData} />
        </SectionCard>

        <SectionCard title={primaryLabel ? `成果指標の推移: ${primaryLabel}` : "成果指標の推移"}>
          {primaryLabel ? (
            <MetricTrendChart data={metricPoints} unitLabel="" />
          ) : (
            <p className="text-sm text-slate-500">数値化された成果指標が資料にありません。</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="政策の流れ(課題 → 翌年度の対応)">
        <PolicyTimeline years={years} />
      </SectionCard>

      <SectionCard title="過去の一般質問・答弁">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 pr-4">年月</th>
                <th className="py-2 pr-4">質問内容</th>
                <th className="py-2 pr-4">答弁</th>
                <th className="py-2 pr-4">その後</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                  未確認: 本事業に紐づく一般質問・委員会質疑・議会答弁の原典資料が、現時点で読み込まれていません。
                  <br />
                  会議録が提供され次第、答弁とその後の対応状況(実施済/一部実施/継続検討/未確認)を追加します。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="注目論点" className="border-mode-question/30 bg-orange-50/20">
        <ol className="space-y-2 text-sm text-slate-700">
          {[
            "政策目的(移住・定住の促進)に対して、事業の設計は適切か",
            "行政自身が認識した課題は、翌年度の予算・事業に反映されたか",
            `${years.length}年間の予算規模に対して、成果は十分と言えるか`,
            "過去の議会答弁で示された方針は実行されたか(会議録の確認が必要)",
            "今後、どの方向へ進むべきか(重点化・縮小・統合の判断)",
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mode-question/15 text-xs font-bold text-mode-question">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </SectionCard>

      <QuestionDrafts data={data} years={years} />

      {detail && (
        <SectionCard title="詳細モード" className="border-slate-300 bg-slate-50">
          <DetailTabs tabs={TABS} active={tab} onChange={setTab} mode="question" />

          {tab === "時系列分析" && <TimeSeriesTable years={years} />}
          {tab === "課題と対応" && <PolicyTimeline years={years} />}
          {tab === "過去答弁" && (
            <div className="rounded-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-600">
              <p className="mb-2 font-semibold text-slate-700">未確認</p>
              <p>
                「検討する」「研究する」「協議する」といった答弁のその後を追跡するには、議会会議録が必要です。
                現時点でプロジェクトに会議録データが無いため、この画面には何も表示していません
                (推測での記載は行いません)。
              </p>
            </div>
          )}
          {tab === "政策指標" && <MetricTable years={years} />}
          {tab === "質問案" && <QuestionDrafts data={data} years={years} bare />}
        </SectionCard>
      )}
    </div>
  );
}

function PolicyTimeline({ years }: { years: ProjectYearRecord[] }) {
  return (
    <ol className="space-y-4">
      {years.map((y) => (
        <li key={y.year} className="relative border-l-2 border-mode-question/30 pl-4">
          <span
            aria-hidden
            className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-mode-question"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{y.year}年度</span>
            <StatusBadge status={y.status} />
          </div>
          <div className="mt-1.5 space-y-1.5 text-sm">
            <div>
              <span className="mr-1 text-xs font-semibold text-rose-700">課題</span>
              <span className="text-slate-700">{y.issuesAndResponse?.issue?.value ?? "資料記載なし"}</span>
              <CitationBadge
                citation={y.issuesAndResponse?.issue?.citation ?? null}
                confidence={y.issuesAndResponse?.issue?.confidence ?? "高"}
              />
            </div>
            <div>
              <span className="mr-1 text-xs font-semibold text-mode-question">翌年度対応</span>
              <span className="text-slate-700">
                {y.issuesAndResponse?.nextYearResponse?.value ?? "資料記載なし"}
              </span>
              <CitationBadge
                citation={y.issuesAndResponse?.nextYearResponse?.citation ?? null}
                confidence={y.issuesAndResponse?.nextYearResponse?.confidence ?? "高"}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TimeSeriesTable({ years }: { years: ProjectYearRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4">年度</th>
            <th className="py-2 pr-4">予算(最終)</th>
            <th className="py-2 pr-4">決算額</th>
            <th className="py-2 pr-4">執行率</th>
            <th className="py-2 pr-4">一般財源</th>
            <th className="py-2 pr-4">状態</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year} className="border-b border-slate-100">
              <td className="py-2 pr-4 font-medium">{y.year}</td>
              <td className="py-2 pr-4 tabular-nums">{formatYen(y.budget?.final.value ?? null)}</td>
              <td className="py-2 pr-4 tabular-nums">{formatYen(y.settlement?.amount.value ?? null)}</td>
              <td className="py-2 pr-4 tabular-nums">
                {formatPercent(resolveExecutionRate(y).value)}
              </td>
              <td className="py-2 pr-4 tabular-nums">{formatYen(y.funding?.generalFund.value ?? null)}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={y.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricTable({ years }: { years: ProjectYearRecord[] }) {
  const labels = Array.from(
    new Set(
      years.flatMap((y) => [
        ...(y.outputOutcome?.outcomes ?? []).map((m) => m.label),
        ...(y.outputOutcome?.outputs ?? []).map((m) => m.label),
      ])
    )
  );

  if (labels.length === 0) return <p className="text-sm text-slate-500">資料記載なし</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4">指標</th>
            {years.map((y) => (
              <th key={y.year} className="py-2 pr-4">
                {y.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label} className="border-b border-slate-100">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">
                {label}
              </th>
              {years.map((y) => {
                const m =
                  (y.outputOutcome?.outcomes ?? []).find((x) => x.label === label) ??
                  (y.outputOutcome?.outputs ?? []).find((x) => x.label === label);
                return (
                  <td key={y.year} className="py-2 pr-4 text-slate-700">
                    {m?.value.value ?? "―"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 質問案。事実(資料に記載され出典を持つもの)と、こちらの推論・提案を明確に分けて表示する。
 */
function QuestionDrafts({
  data,
  years,
  bare = false,
}: {
  data: ProjectData;
  years: ProjectYearRecord[];
  bare?: boolean;
}) {
  const latestSettlement = latestYearWithSettlement(data);
  const latest = years[years.length - 1];

  const drafts: { fact: string; factField: ReactNode; question: string }[] = [];

  if (latestSettlement?.settlement) {
    const rate = resolveExecutionRate(latestSettlement).value;
    const unspent = resolveUnspent(latestSettlement);
    drafts.push({
      fact: `${latestSettlement.year}年度の決算額は${formatYen(
        latestSettlement.settlement.amount.value
      )}、最終予算に対する執行率は${formatPercent(rate)}、不用額は${formatYen(unspent.value)}でした。`,
      factField: (
        <CitationBadge
          citation={latestSettlement.settlement.amount.citation}
          confidence={latestSettlement.settlement.amount.confidence}
        />
      ),
      question:
        "この不用額が生じた要因をどのように分析し、次年度の予算積算にどう反映したのかお伺いします。",
    });
  }

  const issueYear = years.find((y) => y.issuesAndResponse?.issue?.value);
  if (issueYear?.issuesAndResponse?.issue) {
    drafts.push({
      fact: `${issueYear.year}年度の成果説明書には、課題として「${issueYear.issuesAndResponse.issue.value}」と記載されています。`,
      factField: (
        <CitationBadge
          citation={issueYear.issuesAndResponse.issue.citation}
          confidence={issueYear.issuesAndResponse.issue.confidence}
        />
      ),
      question: "この課題に対して、具体的にどのような体制・予算措置で対応する方針かお伺いします。",
    });
  }

  const newOnes = latest?.newInitiatives ?? [];
  if (latest && newOnes.length > 0) {
    drafts.push({
      fact: `${latest.year}年度は「${newOnes.map((n) => n.name).join("」「")}」が新規事業として計上されています。`,
      factField: (
        <CitationBadge citation={newOnes[0].budget.citation} confidence={newOnes[0].budget.confidence} />
      ),
      question:
        "これらの新規事業について、達成目標と、その達成をどの指標で測定するのかをお伺いします。",
    });
  }

  const body = (
    <div className="space-y-3">
      {drafts.map((d, i) => (
        <div key={i} className="rounded-xl border border-mode-question/40 bg-orange-50/50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            事実(資料に記載)
            {d.factField}
          </p>
          <p className="mt-0.5 text-sm text-slate-700">{d.fact}</p>
          <p className="mt-2 text-xs font-semibold text-mode-question">質問案</p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{d.question}</p>
        </div>
      ))}
      {drafts.length === 0 && <p className="text-sm text-slate-500">質問案を組み立てられる資料がありません。</p>}
      <p className="text-xs text-slate-400">
        ※ 「事実」は原典に記載された内容(出典アイコンから確認できます)、「質問案」は本システムが組み立てた文案です。
        質問案の部分は資料に記載された事実ではありません。
      </p>
    </div>
  );

  if (bare) return body;
  return <SectionCard title="そのまま使える質問案">{body}</SectionCard>;
}
