"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatYen } from "@/lib/format";

export interface FundingSlice {
  label: string;
  value: number | null;
}

/**
 * 財源内訳ドーナツチャート。金額0または欠損の財源は描画対象から除外する(補間しない)。
 * dataviz skillの検証済みカテゴリカルパレット(固定順)を使用。
 */
export function FinanceDonutChart({ data }: { data: FundingSlice[] }) {
  const slices = data.filter(
    (d): d is { label: string; value: number } => d.value !== null && d.value > 0
  );

  if (slices.length === 0) {
    return <p className="text-sm text-slate-500">財源データが資料に記載されていません。</p>;
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="viz-root">
      <style>{`
        .viz-root {
          --slot-1: #2a78d6; --slot-2: #eb6834; --slot-3: #1baf7a;
          --slot-4: #eda100; --slot-5: #e87ba4; --slot-6: #008300;
          --muted: #898781; --grid: #e1e0d9;
        }
      `}</style>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {slices.map((_, i) => (
                <Cell key={i} fill={`var(--slot-${(i % 6) + 1})`} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${formatYen(value)} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{ fontSize: 12, border: "1px solid var(--grid)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 space-y-1 text-xs text-slate-600">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: `var(--slot-${(i % 6) + 1})` }}
              />
              {s.label}
            </span>
            <span className="font-medium tabular-nums">{formatYen(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
