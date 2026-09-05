"use client";

import type { ViewMode } from "@/types/project";

const ACTIVE_STYLE: Record<ViewMode, string> = {
  budget: "bg-mode-budget text-white",
  settlement: "bg-mode-settlement text-white",
  question: "bg-mode-question text-white",
  citizen: "bg-mode-citizen text-white",
};

/** 詳細モード内のタブ切り替え。選択状態は色に加えaria-selectedでも伝える。 */
export function DetailTabs<T extends string>({
  tabs,
  active,
  onChange,
  mode,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  mode: ViewMode;
}) {
  return (
    <div role="tablist" className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {tabs.map((t) => {
        const isActive = active === t;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isActive
                ? ACTIVE_STYLE[mode]
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
