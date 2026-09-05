"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatYen } from "@/lib/format";

export interface YearBudgetPoint {
  year: string; // "R4" 等。データが無い年は budget/settlement を null にする(欠損として表示)
  budget: number | null;
  settlement: number | null;
}

/**
 * 予算額と決算額を年度で比較する棒グラフ。
 * dataviz skill の categorical palette 固定順(slot1=blue, slot2=orange)を使用。
 * 2系列のみのためCVD検証済み(references/palette.md記載の隣接ペア検証を満たす)。
 * 欠損年度(null)は棒を描画せず「データなし」注記で明示する(補間しない)。
 */
export function BudgetSettlementChart({ data }: { data: YearBudgetPoint[] }) {
  const hasGap = data.some((d) => d.budget === null || d.settlement === null);

  return (
    <div className="viz-root rounded-lg border border-slate-200 bg-white p-4">
      <style>{`
        .viz-root {
          --surface-1: #fcfcfb;
          --text-primary: #0b0b0b;
          --text-secondary: #52514e;
          --muted: #898781;
          --grid: #e1e0d9;
          --series-budget: #2a78d6;
          --series-settlement: #eb6834;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .viz-root {
            --surface-1: #1a1a19;
            --text-primary: #ffffff;
            --text-secondary: #c3c2b7;
            --muted: #898781;
            --grid: #2c2c2a;
            --series-budget: #3987e5;
            --series-settlement: #d95926;
          }
        }
        :root[data-theme="dark"] .viz-root {
          --surface-1: #1a1a19;
          --text-primary: #ffffff;
          --text-secondary: #c3c2b7;
          --muted: #898781;
          --grid: #2c2c2a;
          --series-budget: #3987e5;
          --series-settlement: #d95926;
        }
      `}</style>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--grid)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatYen(v)}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => formatYen(value)}
              contentStyle={{
                background: "var(--surface-1)",
                border: "1px solid var(--grid)",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="budget"
              name="予算額"
              fill="var(--series-budget)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="settlement"
              name="決算額"
              fill="var(--series-settlement)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasGap && (
        <p className="mt-2 text-xs text-slate-500">
          ※ データが無い年度は棒を表示していません(補間・推測はしていません)。
        </p>
      )}
    </div>
  );
}
