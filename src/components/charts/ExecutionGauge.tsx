/**
 * 執行率の円形ゲージ。SVGのstroke-dasharrayで描画する(ライブラリ不要)。
 * 色だけで状態を伝えないよう、数値と状態ラベル(アイコン付き)を必ず併記する。
 */
export function ExecutionGauge({ rate }: { rate: number | null }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = rate === null ? 0 : Math.max(0, Math.min(rate, 100));
  const dash = (clamped / 100) * circumference;

  // status paletteに準拠(色は補助。判断はラベルとアイコンで伝える)
  const status =
    rate === null
      ? { color: "#898781", label: "算出不可", icon: "―" }
      : rate < 85
        ? { color: "#fab219", label: "執行率が低い", icon: "▲" }
        : rate < 95
          ? { color: "#0ca30c", label: "おおむね執行", icon: "●" }
          : { color: "#0ca30c", label: "ほぼ全額執行", icon: "✔" };

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`執行率 ${rate === null ? "算出不可" : `${rate.toFixed(1)}パーセント`}`}>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e1e0d9" strokeWidth="12" />
        {rate !== null && (
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={status.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 64 64)"
          />
        )}
        <text x="64" y="60" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 24, fontWeight: 700 }}>
          {rate === null ? "―" : rate.toFixed(1)}
        </text>
        <text x="64" y="80" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 12 }}>
          {rate === null ? "算出不可" : "%"}
        </text>
      </svg>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
        <span aria-hidden>{status.icon}</span>
        {status.label}
      </span>
    </div>
  );
}
