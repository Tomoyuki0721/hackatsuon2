import type { Sourced } from "@/types/project";
import { CitationBadge } from "../Citation";

const VARIANT = {
  evaluation: {
    box: "border-emerald-200 bg-emerald-50/60",
    heading: "text-emerald-800",
    icon: "✔",
  },
  issue: {
    box: "border-rose-200 bg-rose-50/60",
    heading: "text-rose-800",
    icon: "!",
  },
  response: {
    box: "border-slate-200 bg-white",
    heading: "text-slate-700",
    icon: "→",
  },
} as const;

/**
 * 「行政の評価・成果」と「行政が記載した課題」を明確に分けて表示するカード。
 * 行政自身の記載と、こちらの分析を混同させないため、原文は必ず出典バッジ付きで表示する。
 */
export function IssueCard({
  title,
  field,
  variant,
}: {
  title: string;
  field: Sourced<string> | null;
  variant: keyof typeof VARIANT;
}) {
  const v = VARIANT[variant];
  return (
    <div className={`rounded-2xl border p-5 ${v.box}`}>
      <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${v.heading}`}>
        <span aria-hidden>{v.icon}</span>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-slate-700">
        {field?.value ?? "資料記載なし"}
      </p>
      <div className="mt-1">
        <CitationBadge citation={field?.citation ?? null} confidence={field?.confidence ?? "高"} />
      </div>
    </div>
  );
}
