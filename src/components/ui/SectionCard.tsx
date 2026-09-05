import type { ReactNode } from "react";

/** 白背景・薄い境界線・角丸・弱い影の汎用カード枠。関連情報のまとまりごとに使う。 */
export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
