import type { MetricEntry } from "@/types/project";
import { CitationBadge } from "../Citation";

/**
 * 実績(OUTPUT)・成果(OUTCOME)を示すアイコンカード。
 * kindで用途を分け、OUTCOMEは政策目的の達成を示すため強調表示にする。
 */
export function OutcomeCard({
  metric,
  kind = "output",
}: {
  metric: MetricEntry;
  kind?: "output" | "outcome";
}) {
  const isOutcome = kind === "outcome";
  return (
    <div
      className={`rounded-xl border p-3 ${
        isOutcome ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <span aria-hidden>{isOutcome ? "🎯" : "📌"}</span>
        {metric.label}
      </p>
      <p
        className={`mt-1 text-lg font-bold leading-snug ${
          isOutcome ? "text-emerald-800" : "text-slate-900"
        }`}
      >
        {metric.value.value ?? "資料記載なし"}
      </p>
      <CitationBadge citation={metric.value.citation} confidence={metric.value.confidence} />
    </div>
  );
}
