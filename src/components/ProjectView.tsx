"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FiscalYear, ProjectData, ViewMode, DetailLevel } from "@/types/project";
import { latestYearRecord } from "@/lib/project-helpers";
import { ProjectHeader } from "./ProjectHeader";
import { DisplayModeTabs } from "./DisplayModeTabs";
import { BudgetMode } from "./modes/BudgetMode";
import { SettlementMode } from "./modes/SettlementMode";
import { QuestionMode } from "./modes/QuestionMode";
import { CitizenMode } from "./modes/CitizenMode";

const MODE_META: Record<ViewMode, { label: string; theme: string; textClass: string }> = {
  budget: { label: "予算モード", theme: "これからの予算は妥当か?", textClass: "text-mode-budget" },
  settlement: { label: "決算モード", theme: "使ったお金で、どんな成果が出たか?", textClass: "text-mode-settlement" },
  question: { label: "一般質問モード", theme: "この政策はどこへ向かっているのか?", textClass: "text-mode-question" },
  citizen: { label: "市民モード", theme: "このお金は、私たちの暮らしにどう役立っている?", textClass: "text-mode-citizen" },
};

/**
 * 1つの事業を「4つの視点」に切り替えて見るページ本体。モードの切り替え自体はSidebarが担い、
 * ここでは現在のmode/view/yearをURLクエリから読み、対応するモードコンポーネントを描画する。
 */
export function ProjectView({ data }: { data: ProjectData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") as ViewMode) || "budget";
  const view = (searchParams.get("view") as DetailLevel) || "normal";
  const detail = view === "detail";
  const yearParam = searchParams.get("year") as FiscalYear | null;
  const selectedYear = data.years.some((y) => y.year === yearParam)
    ? (yearParam as FiscalYear)
    : latestYearRecord(data)?.year ?? data.years[0]?.year;

  function setParams(next: { detail?: boolean; year?: FiscalYear }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.detail !== undefined) params.set("view", next.detail ? "detail" : "normal");
    if (next.year) params.set("year", next.year);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const meta = MODE_META[mode];

  return (
    <div>
      <ProjectHeader
        data={data}
        selectedYear={selectedYear as FiscalYear}
        onSelectYear={(year) => setParams({ year })}
      />

      <div className="px-4 pt-4 sm:px-6">
        <p className={`text-xs font-bold uppercase tracking-wide ${meta.textClass}`}>{meta.label}</p>
        <h2 className="mt-0.5 text-lg font-bold text-slate-800">「{meta.theme}」</h2>

        <div className="mt-3">
          <DisplayModeTabs mode={mode} detail={detail} onChange={(d) => setParams({ detail: d })} />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {mode === "budget" && (
          <BudgetMode data={data} detail={detail} selectedYear={selectedYear as FiscalYear} />
        )}
        {mode === "settlement" && <SettlementMode data={data} detail={detail} />}
        {mode === "question" && <QuestionMode data={data} detail={detail} />}
        {mode === "citizen" && <CitizenMode data={data} detail={detail} />}
      </main>
    </div>
  );
}
