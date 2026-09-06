import type { DetailLevel, FiscalYear, ProjectData, ViewMode } from "@/types/project";
import type { CouncilQa } from "@/types/council";
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
 * 1つの事業を「4つの視点」に切り替えて見るページ本体。
 * mode/view/yearの状態と変更ハンドラは親(ProjectPageClient)から受け取るだけで、
 * ここではルーティングhookを一切使わない(静的書き出し時の空白化を避けるため)。
 */
export function ProjectView({
  data,
  mode,
  view,
  year,
  onChangeView,
  onChangeYear,
  councilQa,
}: {
  data: ProjectData;
  mode: ViewMode;
  view: DetailLevel;
  year: FiscalYear;
  onChangeView: (view: DetailLevel) => void;
  onChangeYear: (year: FiscalYear) => void;
  councilQa: CouncilQa[];
}) {
  const detail = view === "detail";
  const meta = MODE_META[mode];

  return (
    <div>
      <ProjectHeader data={data} selectedYear={year} onSelectYear={onChangeYear} />

      <div className="px-4 pt-4 sm:px-6">
        <p className={`text-xs font-bold uppercase tracking-wide ${meta.textClass}`}>{meta.label}</p>
        <h2 className="mt-0.5 text-lg font-bold text-slate-800">「{meta.theme}」</h2>

        <div className="mt-3">
          <DisplayModeTabs
            mode={mode}
            detail={detail}
            onChange={(d) => onChangeView(d ? "detail" : "normal")}
          />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {mode === "budget" && <BudgetMode data={data} detail={detail} selectedYear={year} />}
        {mode === "settlement" && <SettlementMode data={data} detail={detail} selectedYear={year} />}
        {mode === "question" && <QuestionMode data={data} detail={detail} councilQa={councilQa} />}
        {mode === "citizen" && <CitizenMode data={data} detail={detail} selectedYear={year} />}
      </main>
    </div>
  );
}
