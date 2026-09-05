import type { Citation, Confidence, NewInitiative } from "@/types/project";
import { formatYen } from "@/lib/format";
import { CitationBadge } from "../Citation";

const LABEL_STYLE: Record<NewInitiative["label"], string> = {
  NEW: "bg-pink-600",
  拡充: "bg-rose-500",
  対象拡大: "bg-fuchsia-500",
  制度変更: "bg-violet-500",
};

const LABEL_ICON: Record<NewInitiative["label"], string> = {
  NEW: "✦",
  拡充: "▲",
  対象拡大: "◆",
  制度変更: "●",
};

/**
 * 新規事業カード。既存事業と混在させないよう、ピンク系の縁取り+NEWバッジで独立した見た目にする。
 * 名称/予算/目的/対象/内容/期待成果を1枚にまとめる。
 */
export function NewProjectCard({ item }: { item: NewInitiative }) {
  return (
    <div className="rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${LABEL_STYLE[item.label]}`}
        >
          <span aria-hidden>{LABEL_ICON[item.label]}</span>
          {item.label}
        </span>
        <span className="text-xs text-slate-400">{item.startYear}年度〜</span>
      </div>

      <p className="text-base font-bold text-slate-900">{item.name}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums text-pink-700">
          {formatYen(item.budget.value)}
        </span>
        <CitationBadge citation={item.budget.citation} confidence={item.budget.confidence} />
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <Row label="目的" value={item.purpose.value} citation={item.purpose.citation} confidence={item.purpose.confidence} />
        <Row label="対象" value={item.targetAudience.value} citation={item.targetAudience.citation} confidence={item.targetAudience.confidence} />
        <Row label="内容" value={item.content.value} citation={item.content.citation} confidence={item.content.confidence} />
        <Row label="期待される効果" value={item.expectedOutcome.value} citation={item.expectedOutcome.citation} confidence={item.expectedOutcome.confidence} />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  citation,
  confidence,
}: {
  label: string;
  value: string | null;
  citation: Citation | null;
  confidence: Confidence;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="flex flex-wrap items-start gap-1 text-slate-700">
        <span>{value ?? "資料記載なし"}</span>
        <CitationBadge citation={citation} confidence={confidence} />
      </dd>
    </div>
  );
}
