import type { Sourced } from "@/types/project";
import { CitationBadge } from "./Citation";
import { formatYen } from "@/lib/format";

/** ラベル+テキスト値+出典バッジ、を1行で表示する。value.value が null なら「資料記載なし」を表示。 */
export function SourcedText({ label, field }: { label: string; field: Sourced<string> | null }) {
  const value = field?.value ?? null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex flex-wrap items-center gap-1 text-sm text-slate-900">
        <span>{value ?? "資料記載なし"}</span>
        <CitationBadge citation={field?.citation ?? null} confidence={field?.confidence ?? "高"} />
      </span>
    </div>
  );
}

/** ラベル+円額+出典バッジ。内部値はfield.valueを丸めずそのまま保持、formatYenで表示専用の単位変換のみ行う。 */
export function SourcedYen({ label, field }: { label: string; field: Sourced<number> | null }) {
  const value = field?.value ?? null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex flex-wrap items-center gap-1 text-base font-semibold text-slate-900">
        <span>{formatYen(value)}</span>
        <CitationBadge citation={field?.citation ?? null} confidence={field?.confidence ?? "高"} />
      </span>
    </div>
  );
}
