import type { ViewMode } from "@/types/project";

const MODE_ACTIVE: Record<ViewMode, string> = {
  budget: "border-mode-budget text-mode-budget",
  settlement: "border-mode-settlement text-mode-settlement",
  question: "border-mode-question text-mode-question",
  citizen: "border-mode-citizen text-mode-citizen",
};

/** ［通常表示］［詳細モード］の大きいタブ。同一ページ内での切り替えで遷移しない。 */
export function DisplayModeTabs({
  mode,
  detail,
  onChange,
}: {
  mode: ViewMode;
  detail: boolean;
  onChange: (detail: boolean) => void;
}) {
  return (
    <div role="tablist" aria-label="表示レベル切り替え" className="flex gap-6 border-b border-slate-200">
      {[
        { key: false, label: "通常表示" },
        { key: true, label: "詳細モード" },
      ].map((t) => {
        const active = detail === t.key;
        return (
          <button
            key={String(t.key)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm font-bold transition ${
              active ? MODE_ACTIVE[mode] : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
