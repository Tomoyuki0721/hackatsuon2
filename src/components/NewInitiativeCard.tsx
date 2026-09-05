import type { NewInitiative } from "@/types/project";
import { SourcedText, SourcedYen } from "./SourcedValue";

const LABEL_ICON: Record<NewInitiative["label"], string> = {
  NEW: "✦",
  拡充: "▲",
  対象拡大: "◆",
  制度変更: "●",
};

/**
 * 新規/拡充事業を枠で強調表示するカード。
 * ラベルは色だけに依存せずアイコン+テキストで示す(アクセシビリティ)。
 */
export function NewInitiativeCard({ item }: { item: NewInitiative }) {
  return (
    <div className="rounded-lg border-2 border-mode-budget/40 bg-blue-50/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-mode-budget px-2 py-0.5 text-xs font-bold text-white">
          <span aria-hidden>{LABEL_ICON[item.label]}</span>
          {item.label}
        </span>
        <span className="text-sm font-semibold text-slate-900">{item.name}</span>
        <span className="text-xs text-slate-500">{item.startYear}年度〜</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SourcedYen label="予算額" field={item.budget} />
        <SourcedText label="財源" field={item.funding} />
        <SourcedText label="目的" field={item.purpose} />
        <SourcedText label="対象者" field={item.targetAudience} />
        <SourcedText label="実施内容" field={item.content} />
        <SourcedText label="期待される成果" field={item.expectedOutcome} />
      </div>
    </div>
  );
}
