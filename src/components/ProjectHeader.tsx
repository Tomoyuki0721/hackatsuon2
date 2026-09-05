"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FiscalYear, ProjectData } from "@/types/project";
import { StatusBadge } from "./ui/StatusBadge";

/**
 * 事業ページ共通ヘッダー。事業名・所管・現在年度のステータス・年度選択・お気に入りを表示する。
 * 「短い説明」はProjectMasterに存在しないキャッチコピーを創作しないため、
 * 実データであるpolicyCategory(政策分野)を代わりに表示する。
 * PDFリンクは原典PDFを公開ホスティングしていないため、準備中として非活性表示にする。
 */
export function ProjectHeader({
  data,
  selectedYear,
  onSelectYear,
}: {
  data: ProjectData;
  selectedYear: FiscalYear;
  onSelectYear: (year: FiscalYear) => void;
}) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`favorite:${data.master.projectId}`);
      setFavorite(saved === "1");
    } catch {
      // localStorageが使えない環境ではお気に入り機能を無効化するだけで、表示は継続する
    }
  }, [data.master.projectId]);

  function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      localStorage.setItem(`favorite:${data.master.projectId}`, next ? "1" : "0");
    } catch {
      // 保存できなくても表示上のトグルは維持する
    }
  }

  const currentYearRecord = data.years.find((y) => y.year === selectedYear);

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
      <nav aria-label="パンくず" className="mb-2 text-xs text-slate-400">
        <Link href="/" className="hover:underline">
          ホーム
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-slate-500">{data.master.canonicalName}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{data.master.canonicalName}</h1>
            {currentYearRecord && <StatusBadge status={currentYearRecord.status} />}
          </div>
          <p className="mt-1 text-sm text-slate-500">{data.master.policyCategory}</p>
          <p className="mt-1 text-xs text-slate-400">
            所管: {data.master.department} / {data.master.section}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            年度
            <select
              value={selectedYear}
              onChange={(e) => onSelectYear(e.target.value as FiscalYear)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mode-budget"
            >
              {data.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}年度
                </option>
              ))}
            </select>
          </label>

          <span
            title="原典PDFは掲載準備中です"
            className="cursor-not-allowed rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-300"
          >
            PDFを見る
          </span>

          <button
            type="button"
            onClick={toggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? "お気に入りから外す" : "お気に入りに追加"}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
              favorite
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span aria-hidden>{favorite ? "★" : "☆"}</span> お気に入り
          </button>
        </div>
      </div>
    </div>
  );
}
