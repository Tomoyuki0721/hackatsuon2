import type { Sourced } from "@/types/project";
import { formatSignedPercent, formatYen } from "@/lib/format";
import { CitationBadge } from "../Citation";

function splitValue(value: number | null, unit: "yen" | "percent"): [string, string] | null {
  if (value === null) return null;
  if (unit === "percent") return [value.toFixed(1), "%"];
  const yen = formatYen(value);
  const match = yen.match(/^([\d,.]+)(.*)$/);
  return match ? [match[1], match[2]] : null;
}

type Trend = "up" | "down" | "flat" | null;

function trendOf(value: number | null): Trend {
  if (value === null) return null;
  if (Math.abs(value) < 0.05) return "flat";
  return value > 0 ? "up" : "down";
}

const TREND_ICON: Record<Exclude<Trend, null>, string> = {
  up: "▲",
  down: "▼",
  flat: "―",
};

/**
 * KPIカード: 大きい数字+小さい単位、前年比は矢印付き。
 * 「数字を大きく、単位を小さく」「増減は矢印付き」という指示を1コンポーネントに集約する。
 */
export function KpiCard({
  label,
  field,
  value: valueOverride,
  computed = false,
  changePercent,
  unit = "yen",
  accentClassName = "text-slate-900",
}: {
  label: string;
  field: Sourced<number> | null;
  /** 原典に無く、出典のある数値から計算した値を表示する場合に渡す */
  value?: number | null;
  /** true のとき「計算値」と明示する */
  computed?: boolean;
  changePercent?: number | null;
  unit?: "yen" | "percent";
  accentClassName?: string;
}) {
  const value = valueOverride !== undefined ? valueOverride : (field?.value ?? null);
  const trend = changePercent !== undefined ? trendOf(changePercent ?? null) : null;
  const split = splitValue(value, unit);

  return (
    <div className="min-w-[9.5rem] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {split ? (
        <p className={`mt-1 leading-none ${accentClassName}`}>
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">{split[0]}</span>
          <span className="ml-1 text-xs font-medium text-slate-500">{split[1]}</span>
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-slate-400">資料記載なし</p>
      )}
      <div className="mt-1 flex items-center gap-1">
        {computed ? (
          <span
            className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500"
            title="原典に記載がないため、出典のある予算額・決算額から本システムが計算した値です"
          >
            計算値
          </span>
        ) : (
          <CitationBadge citation={field?.citation ?? null} confidence={field?.confidence ?? "高"} />
        )}
        {changePercent !== undefined && trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              trend === "up" ? "text-rose-600" : trend === "down" ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <span aria-hidden>{TREND_ICON[trend]}</span>
            {formatSignedPercent(changePercent ?? null)}
          </span>
        )}
      </div>
    </div>
  );
}
