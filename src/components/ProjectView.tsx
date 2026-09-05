"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProjectData, ViewMode, DetailLevel } from "@/types/project";
import { latestYearRecord } from "@/lib/project-helpers";
import { formatYen } from "@/lib/format";
import { BudgetMode } from "./modes/BudgetMode";
import { SettlementMode } from "./modes/SettlementMode";
import { QuestionMode } from "./modes/QuestionMode";
import { CitizenMode } from "./modes/CitizenMode";

const MODES: { key: ViewMode; label: string; colorClass: string }[] = [
  { key: "budget", label: "予算モード", colorClass: "mode-budget" },
  { key: "settlement", label: "決算モード", colorClass: "mode-settlement" },
  { key: "question", label: "一般質問モード", colorClass: "mode-question" },
  { key: "citizen", label: "市民モード", colorClass: "mode-citizen" },
];

const MODE_THEME: Record<ViewMode, string> = {
  budget: "bg-mode-budget text-white",
  settlement: "bg-mode-settlement text-white",
  question: "bg-mode-question text-white",
  citizen: "bg-mode-citizen text-white",
};

/**
 * 1つの事業を「4つの視点」に切り替えて見るUI。モードと詳細/通常の状態はURLクエリに同期する
 * (?mode=budget|settlement|question|citizen&view=normal|detail)。4モードを縦並びにはしない。
 */
export function ProjectView({ data }: { data: ProjectData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") as ViewMode) || "budget";
  const view = (searchParams.get("view") as DetailLevel) || "normal";
  const detail = view === "detail";

  function setParams(next: { mode?: ViewMode; view?: DetailLevel }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.mode) params.set("mode", next.mode);
    if (next.view) params.set("view", next.view);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const current = latestYearRecord(data);

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <p className="text-xs text-slate-500">
            {data.master.department} / {data.master.section}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            {data.master.canonicalName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {current?.year}年度当初予算: {formatYen(current?.budget?.initial.value ?? null)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="表示モード切り替え">
            {MODES.map((m) => (
              <button
                key={m.key}
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => setParams({ mode: m.key })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === m.key
                    ? MODE_THEME[m.key]
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button
              onClick={() => setParams({ view: detail ? "normal" : "detail" })}
              aria-pressed={detail}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <span aria-hidden>{detail ? "▼" : "▶"}</span>
              {detail ? "通常表示にもどす" : "詳細モードを見る"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {mode === "budget" && <BudgetMode data={data} detail={detail} />}
        {mode === "settlement" && <SettlementMode data={data} detail={detail} />}
        {mode === "question" && <QuestionMode data={data} detail={detail} />}
        {mode === "citizen" && <CitizenMode data={data} detail={detail} />}
      </main>
    </div>
  );
}
