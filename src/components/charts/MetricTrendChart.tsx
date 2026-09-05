"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MetricPoint {
  year: string;
  value: number | null;
}

/**
 * 成果指標の経年推移(折れ線)。データが無い年度は線をつながず欠損として扱う
 * (connectNulls=false。推測で補間しない)。単一系列のため凡例は置かず、タイトルで系列名を示す。
 */
export function MetricTrendChart({ data, unitLabel }: { data: MetricPoint[]; unitLabel?: string }) {
  const hasAny = data.some((d) => d.value !== null);
  if (!hasAny) {
    return <p className="text-sm text-slate-500">数値化できる指標が資料にありません。</p>;
  }

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="year"
            tick={{ fill: "#898781", fontSize: 12 }}
            axisLine={{ stroke: "#e1e0d9" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#898781", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: number) => `${value.toLocaleString("ja-JP")}${unitLabel ?? ""}`}
            contentStyle={{ fontSize: 12, border: "1px solid #e1e0d9" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2a78d6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#2a78d6" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
