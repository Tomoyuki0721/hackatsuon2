import type { ProjectStatus } from "@/types/project";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  継続: "border-slate-300 bg-slate-50 text-slate-700",
  新規: "border-pink-300 bg-pink-50 text-pink-700",
  拡充: "border-pink-300 bg-pink-50 text-pink-700",
  縮小: "border-amber-300 bg-amber-50 text-amber-700",
  終了: "border-slate-300 bg-slate-100 text-slate-500",
  統合: "border-violet-300 bg-violet-50 text-violet-700",
  分割: "border-violet-300 bg-violet-50 text-violet-700",
};

const STATUS_ICON: Record<ProjectStatus, string> = {
  継続: "●",
  新規: "✦",
  拡充: "▲",
  縮小: "▽",
  終了: "■",
  統合: "◆",
  分割: "◇",
};

/** 事業ステータス(継続/新規/拡充/縮小/終了/統合/分割)。色だけでなくアイコン+ラベルで示す。 */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden>{STATUS_ICON[status]}</span>
      {status}
    </span>
  );
}
