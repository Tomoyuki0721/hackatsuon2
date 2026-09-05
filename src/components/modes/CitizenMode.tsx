"use client";

import { useState } from "react";
import type { FiscalYear, ProjectData, ProjectYearRecord } from "@/types/project";
import { findYearRecord, latestYearRecord, latestYearWithSettlement } from "@/lib/project-helpers";
import { formatYen } from "@/lib/format";
import { SectionCard } from "../ui/SectionCard";
import { DetailTabs } from "../ui/DetailTabs";
import { CitationBadge } from "../Citation";

const TABS = ["事業の内容", "暮らしとの関係", "利用方法", "FAQ", "お金の内訳"] as const;
type Tab = (typeof TABS)[number];

const ICONS = ["💬", "🏡", "🧳", "🔑", "🌾", "💼"];

/**
 * 市民モード:「このお金は、私たちの暮らしにどう役立っている?」
 * 行政用語(款項目コード等)を前面に出さず、事業の内容・対象・成果を平易に伝える。
 * 文章は原典の記載をそのまま引用し、こちらで事実を創作しない。
 */
export function CitizenMode({
  data,
  detail,
  selectedYear,
}: {
  data: ProjectData;
  detail: boolean;
  selectedYear: FiscalYear;
}) {
  const [tab, setTab] = useState<Tab>("事業の内容");

  const current = findYearRecord(data, selectedYear) ?? latestYearRecord(data);
  const withResults = latestYearWithSettlement(data);

  if (!current) return <p className="text-sm text-slate-500">情報がありません。</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="この事業は何をするもの?" className="lg:col-span-2 border-pink-200 bg-pink-50/40">
          <p className="text-base leading-relaxed text-slate-800">
            {current.overview?.value ?? current.purpose?.value ?? "資料記載なし"}
          </p>
          <div className="mt-1">
            <CitationBadge
              citation={(current.overview ?? current.purpose)?.citation ?? null}
              confidence={(current.overview ?? current.purpose)?.confidence ?? "高"}
            />
          </div>
        </SectionCard>

        <SectionCard title="今年度、いくら使う予定?">
          <p className="text-3xl font-bold text-mode-citizen">
            {formatYen(current.budget?.initial.value ?? null)}
          </p>
          <div className="mt-1">
            <CitationBadge
              citation={current.budget?.initial.citation ?? null}
              confidence={current.budget?.initial.confidence ?? "高"}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {current.year}年度({fiscalYearLabel(current.year)})の予算です。
          </p>
        </SectionCard>
      </div>

      {withResults && (
        <SectionCard title={`昨年度(${withResults.year}年度)、こんな成果がありました`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...(withResults.outputOutcome?.outcomes ?? []), ...(withResults.outputOutcome?.outputs ?? [])]
              .slice(0, 8)
              .map((m, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
                >
                  <div className="text-3xl" aria-hidden>
                    {ICONS[i % ICONS.length]}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{plainLabel(m.label)}</p>
                  <p className="text-base font-bold text-slate-900">{m.value.value ?? "資料記載なし"}</p>
                </div>
              ))}
          </div>
          {(withResults.outputOutcome?.outputs ?? []).length === 0 &&
            (withResults.outputOutcome?.outcomes ?? []).length === 0 && (
              <p className="text-sm text-slate-500">資料記載なし</p>
            )}
        </SectionCard>
      )}

      <SectionCard title={`${current.year}年度の取り組み`}>
        {current.implementation && current.implementation.mainSubProjects.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {current.implementation.mainSubProjects.map((sp, i) => (
              <div
                key={i}
                className="flex min-w-[10rem] flex-1 items-start gap-2 rounded-xl border border-slate-200 bg-white p-3"
              >
                <span className="text-xl" aria-hidden>
                  {ICONS[i % ICONS.length]}
                </span>
                <span className="text-sm text-slate-700">{shortName(sp.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">資料記載なし</p>
        )}
      </SectionCard>

      {current.newInitiatives.length > 0 && (
        <SectionCard title="今年から始まること" className="border-pink-300 bg-pink-50/60">
          <ul className="space-y-3">
            {current.newInitiatives.map((ni, i) => (
              <li key={i} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="flex items-center gap-2">
                  <span className="rounded-full bg-mode-citizen px-2 py-0.5 text-xs font-bold text-white">
                    <span aria-hidden>✦</span> あたらしい
                  </span>
                  <span className="font-bold text-slate-900">{ni.name}</span>
                </p>
                <p className="mt-1.5 text-sm text-slate-600">{ni.purpose.value ?? "資料記載なし"}</p>
                <CitationBadge citation={ni.purpose.citation} confidence={ni.purpose.confidence} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="よくある質問">
        <Faq current={current} withResults={withResults} />
      </SectionCard>

      {detail && (
        <SectionCard title="もっとくわしく" className="border-slate-300 bg-slate-50">
          <DetailTabs tabs={TABS} active={tab} onChange={setTab} mode="citizen" />

          {tab === "事業の内容" && (
            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              <p>{current.overview?.value ?? "資料記載なし"}</p>
              <CitationBadge
                citation={current.overview?.citation ?? null}
                confidence={current.overview?.confidence ?? "高"}
              />
              <div>
                <p className="text-xs font-semibold text-slate-500">この事業の目的</p>
                <p>{current.purpose?.value ?? "資料記載なし"}</p>
                <CitationBadge
                  citation={current.purpose?.citation ?? null}
                  confidence={current.purpose?.confidence ?? "高"}
                />
              </div>
            </div>
          )}

          {tab === "暮らしとの関係" && (
            <div className="space-y-2 text-sm text-slate-700">
              <p>この事業は、次のような場面で暮らしに関わります。</p>
              <ul className="space-y-1.5">
                {(current.implementation?.mainSubProjects ?? []).map((sp, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2">
                    <span aria-hidden>{ICONS[i % ICONS.length]}</span>
                    <span>{shortName(sp.value)}</span>
                  </li>
                ))}
                {(current.implementation?.mainSubProjects ?? []).length === 0 && (
                  <li className="text-slate-500">資料記載なし</li>
                )}
              </ul>
              <p className="text-xs text-slate-400">
                ※ 各取り組みの内容は原典(予算・成果説明資料)の記載に基づいています。
              </p>
            </div>
          )}

          {tab === "利用方法" && (
            <div className="space-y-3">
              <ol className="space-y-2">
                {["相談する", "情報を見る", "お試しで滞在する", "支援を受ける"].map((step, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mode-citizen/15 text-sm font-bold text-mode-citizen">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-500">
                ※ 上記は事業内容から想定される一般的な流れです。
                <strong>具体的な申請方法・窓口・連絡先は原典資料に記載がないため、このサイトでは案内できません。</strong>
                実際の手続きは{data.master.section}へお問い合わせください。
              </p>
            </div>
          )}

          {tab === "FAQ" && <Faq current={current} withResults={withResults} />}

          {tab === "お金の内訳" && <MoneyBreakdown current={current} />}
        </SectionCard>
      )}
    </div>
  );
}

function fiscalYearLabel(year: FiscalYear): string {
  return `令和${year.replace("R", "")}年度`;
}

/** 行政用語を含むラベルを、市民向けに短く言い換える(意味を変えない範囲での表記の簡略化のみ)。 */
function plainLabel(label: string): string {
  return label
    .replace("(センター経由)", "")
    .replace("空き家バンク新規物件登録", "空き家の新規登録")
    .replace("空き家バンク新規成約件数", "空き家の成約")
    .replace("ふるさとワーキングホリデー参加", "ワーキングホリデー参加")
    .replace("お試し移住利用", "お試し移住の利用");
}

/** 「◯◯業務委託 12,345,678円」のような表記から、金額部分を落として名称だけを取り出す。 */
function shortName(value: string | null): string {
  if (!value) return "資料記載なし";
  return value.replace(/\s*[\d,]+円.*$/, "").trim() || value;
}

function Faq({
  current,
  withResults,
}: {
  current: ProjectYearRecord;
  withResults: ProjectYearRecord | null;
}) {
  const funding = current.funding;
  const hasNonTax =
    (funding?.nationalGrant.value ?? 0) > 0 ||
    (funding?.prefecturalGrant.value ?? 0) > 0 ||
    (funding?.fund.value ?? 0) > 0 ||
    (funding?.other.value ?? 0) > 0;

  const items: { q: string; a: string }[] = [
    {
      q: "この事業には、いくら使うのですか?",
      a: `${fiscalYearLabel(current.year)}の予算は${formatYen(current.budget?.initial.value ?? null)}です。`,
    },
    {
      q: "お金はすべて市民の税金ですか?",
      a: hasNonTax
        ? `いいえ。市の一般財源(税金など)のほかに、国や県からの補助金・基金なども使っています。内訳は「お金の内訳」でご覧いただけます。`
        : `資料に記載されている財源の内訳では、市の一般財源が中心です。詳しくは「お金の内訳」をご覧ください。`,
    },
  ];

  if (withResults?.outputOutcome?.outcomes?.[0]) {
    const o = withResults.outputOutcome.outcomes[0];
    items.push({
      q: "実際に成果は出ているのですか?",
      a: `${fiscalYearLabel(withResults.year)}は、${plainLabel(o.label)}が${o.value.value ?? "資料記載なし"}でした。`,
    });
  }

  if (withResults?.issuesAndResponse?.issue?.value) {
    items.push({
      q: "課題はありますか?",
      a: `市自身が${fiscalYearLabel(withResults.year)}の報告書で、「${withResults.issuesAndResponse.issue.value}」と課題を挙げています。`,
    });
  }

  return (
    <dl className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="flex gap-2 text-sm font-bold text-slate-800">
            <span className="text-mode-citizen" aria-hidden>
              Q
            </span>
            {it.q}
          </dt>
          <dd className="mt-1.5 flex gap-2 text-sm text-slate-700">
            <span className="font-bold text-slate-400" aria-hidden>
              A
            </span>
            <span>{it.a}</span>
          </dd>
        </div>
      ))}
      <p className="text-xs text-slate-400">
        ※ 回答はいずれも市の予算書・成果説明書に記載された数値をもとにしています。
      </p>
    </dl>
  );
}

function MoneyBreakdown({ current }: { current: ProjectYearRecord }) {
  const f = current.funding;
  if (!f) return <p className="text-sm text-slate-500">資料記載なし</p>;

  const rows = [
    { label: "市のお金(一般財源)", note: "市税などでまかなう分", value: f.generalFund.value },
    { label: "国からの補助", note: "国庫支出金", value: f.nationalGrant.value },
    { label: "県からの補助", note: "県支出金", value: f.prefecturalGrant.value },
    { label: "基金からの繰入", note: "ふるさと応援基金など", value: f.fund.value },
    { label: "その他", note: "", value: f.other.value },
    { label: "借入(市債)", note: "", value: f.municipalBond.value },
  ].filter((r) => r.value !== null && r.value > 0);

  if (rows.length === 0) return <p className="text-sm text-slate-500">資料記載なし</p>;

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
          <span className="text-sm">
            <span className="font-medium text-slate-800">{r.label}</span>
            {r.note && <span className="ml-1 text-xs text-slate-400">({r.note})</span>}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">{formatYen(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
