"use client";

import { useState } from "react";
import type { Citation as CitationType, Confidence } from "@/types/project";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  高: "",
  中: "border border-amber-400 bg-amber-50 text-amber-800",
  低: "border border-slate-400 bg-slate-50 text-slate-700",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  高: "",
  中: "要確認",
  低: "AI抽出・未確認",
};

/**
 * 数値・テキストの隣に出典アイコンを表示し、クリックすると
 * 資料名・ページ・原文抜粋をポップオーバー表示する。
 * confidenceが中/低の場合はバッジも併記する(matching-rules.md §5)。
 */
export function CitationBadge({
  citation,
  confidence = "高",
}: {
  citation: CitationType | null;
  confidence?: Confidence;
}) {
  const [open, setOpen] = useState(false);

  if (!citation) {
    return (
      <span className="ml-1 inline-block rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
        資料記載なし
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center gap-1 align-middle">
      {confidence !== "高" && (
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${CONFIDENCE_STYLE[confidence]}`}
        >
          {CONFIDENCE_LABEL[confidence]}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="出典を表示"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500 hover:bg-slate-100"
      >
        i
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-20 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-lg">
          <span className="block font-semibold text-slate-900">
            {citation.sourceDocument}
            {citation.sourcePage ? ` p.${citation.sourcePage}` : ""}
          </span>
          {citation.sourceText && (
            <span className="mt-1 block whitespace-pre-wrap text-slate-600">
              「{citation.sourceText}」
            </span>
          )}
          {!citation.sourceText && (
            <span className="mt-1 block text-slate-400">原文抜粋: 資料記載なし</span>
          )}
        </span>
      )}
    </span>
  );
}
