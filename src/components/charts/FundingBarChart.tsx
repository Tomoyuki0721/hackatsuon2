"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatYen } from "@/lib/format";

export interface FundingBar {
  label: string;
  value: number | null;
}

const SLOTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

/**
 * 財源ごとの金額を比較する横棒グラフ。金額0・欠損の財源は描画しない(補間しない)。
 * 直接ラベル(金額)を右側に併記するため、色は識別の補助にとどまる。
 */
export function FundingBarChart({ data }: { data: FundingBar[] }) {
  const bars = data.filter((d): d is { label: string; value: number } => d.value !== null && d.value > 0);

  if (bars.length === 0) {
    return <p className="text-sm text-slate-500">財源データが資料に記載されていません。</p>;
  }

  return (
    <div>
      <div style={{ width: "100%", height: Math.max(140, bars.length * 44) }}>
        <ResponsiveContainer>
          <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#e1e0d9" />
            <XAxis
              type="number"
              tick={{ fill: "#898781", fontSize: 11 }}
              tickFormatter={(v: number) => formatYen(v)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              tick={{ fill: "#52514e", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => formatYen(value)}
              contentStyle={{ fontSize: 12, border: "1px solid #e1e0d9" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {bars.map((_, i) => (
                <Cell key={i} fill={SLOTS[i % SLOTS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-600">
        {bars.map((b) => (
          <li key={b.label} className="flex items-center justify-between">
            <span>{b.label}</span>
            <span className="font-medium tabular-nums">{formatYen(b.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
