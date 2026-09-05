"use client";

import { useState } from "react";
import type { ProjectData } from "@/types/project";
import { sortedYears } from "@/lib/project-helpers";
import { formatYen } from "@/lib/format";
import { SourcedText } from "../SourcedValue";
import { CitationBadge } from "../Citation";
import { BudgetSettlementChart } from "../BudgetSettlementChart";

const TABS = ["時系列分析", "過去の答弁", "課題と対応", "政策指標", "論点・質問案"] as const;
type Tab = (typeof TABS)[number];

/**
 * 一般質問モード:「この政策はどこへ向かっているのか?」
 * 通常表示: 経年の予算・決算・一般財源・KPI推移、主要事業の変遷、新規事業の履歴、
 * 認識されている課題と翌年度対応の連鎖。
 * 詳細モード: 5つのタブ(時系列分析/過去の答弁/課題と対応/政策指標/論点・質問案)。
 */
export function QuestionMode({ data, detail }: { data: ProjectData; detail: boolean }) {
  const years = sortedYears(data);
  const [tab, setTab] = useState<Tab>("時系列分析");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">経年推移(予算・決算・一般財源)</h3>
        <BudgetSettlementChart
          data={years.map((y) => ({
            year: y.year,
            budget: y.budget?.final.value ?? null,
            settlement: y.settlement?.amount.value ?? null,
          }))}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-1 pr-4">年度</th>
                <th className="py-1 pr-4">予算(最終)</th>
                <th className="py-1 pr-4">決算額</th>
                <th className="py-1 pr-4">一般財源</th>
                <th className="py-1 pr-4">状態</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 font-medium">{y.year}</td>
                  <td className="py-1.5 pr-4">{formatYen(y.budget?.final.value ?? null)}</td>
                  <td className="py-1.5 pr-4">{formatYen(y.settlement?.amount.value ?? null)}</td>
                  <td className="py-1.5 pr-4">{formatYen(y.funding?.generalFund.value ?? null)}</td>
                  <td className="py-1.5 pr-4">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                      {y.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">課題 → 翌年度対応 の連鎖</h3>
        <ol className="space-y-3">
          {years.map((y) => (
            <li key={y.year} className="flex flex-col gap-1 border-l-2 border-mode-question/40 pl-3">
              <span className="text-xs font-semibold text-slate-500">{y.year}年度</span>
              <SourcedText label="課題" field={y.issuesAndResponse?.issue ?? null} />
              <SourcedText label="翌年度への対応" field={y.issuesAndResponse?.nextYearResponse ?? null} />
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">新規事業の履歴</h3>
        {years.some((y) => y.newInitiatives.length > 0) ? (
          <ul className="space-y-2">
            {years.flatMap((y) =>
              y.newInitiatives.map((ni, i) => (
                <li key={`${y.year}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-mode-question px-1.5 py-0.5 text-xs font-bold text-white">
                    {ni.label}
                  </span>
                  <span className="font-medium">{ni.name}</span>
                  <span className="text-slate-400">({y.year}年度〜)</span>
                </li>
              ))
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">資料記載なし</p>
        )}
      </section>

      {detail && (
        <section className="rounded-xl border border-slate-300 bg-slate-50 p-5">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tab === t
                    ? "bg-mode-question text-white"
                    : "border border-slate-300 bg-white text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "時系列分析" && (
            <p className="text-sm text-slate-600">
              上部の経年推移表を参照してください。3年以上のデータが揃うと傾向が明確になります(現状: {years.length}年度分)。
            </p>
          )}

          {tab === "過去の答弁" && (
            <div className="rounded border border-slate-300 bg-white p-3 text-sm text-slate-600">
              未確認: 一般質問・委員会質疑・議会答弁を本事業に紐づける原典資料は、現時点でプロジェクトに読み込まれていません。該当資料が提供され次第、答弁内容と対応状況(実施/一部実施/継続検討/未確認)を追加します。
            </div>
          )}

          {tab === "課題と対応" && (
            <ol className="space-y-3">
              {years.map((y) => (
                <li key={y.year} className="text-sm">
                  <span className="font-semibold">{y.year}: </span>
                  {y.issuesAndResponse?.issue?.value ?? "資料記載なし"}
                  <CitationBadge
                    citation={y.issuesAndResponse?.issue?.citation ?? null}
                    confidence={y.issuesAndResponse?.issue?.confidence ?? "高"}
                  />
                </li>
              ))}
            </ol>
          )}

          {tab === "政策指標" && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {years.flatMap((y) =>
                (y.outputOutcome?.outcomes ?? []).map((m, i) => (
                  <div key={`${y.year}-${i}`} className="rounded border border-slate-200 bg-white p-2 text-sm">
                    <span className="text-xs text-slate-500">
                      {y.year} {m.label}
                    </span>
                    <div className="flex items-center gap-1 font-medium">
                      {m.value.value ?? "資料記載なし"}
                      <CitationBadge citation={m.value.citation} confidence={m.value.confidence} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "論点・質問案" && (
            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">
                以下は原典から確認できる事実にもとづく論点案です(推測部分は明示しています)。
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  ①事実確認: {years[years.length - 1]?.year}年度の予算・決算・成果は資料の通りか。
                </li>
                <li>②原因: 執行率や成果指標の変化の要因は何か。</li>
                <li>③行政評価: 行政自身は成果をどう評価しているか(上記「行政の評価・成果」参照)。</li>
                <li>④政策判断: 記載された課題は次年度予算に反映されているか。</li>
                <li>
                  ⑤今後の方向性(推測を含む可能性あり): 現時点の資料からは断定できないため、担当課への確認が必要。
                </li>
              </ol>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
