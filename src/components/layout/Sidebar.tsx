"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ViewMode } from "@/types/project";

const MODES: { key: ViewMode; label: string; theme: string; icon: string; barClass: string }[] = [
  { key: "budget", label: "予算モード", theme: "これからの予算は妥当か?", icon: "💰", barClass: "bg-mode-budget" },
  { key: "settlement", label: "決算モード", theme: "使ったお金で、どんな成果?", icon: "📊", barClass: "bg-mode-settlement" },
  { key: "question", label: "一般質問モード", theme: "この政策はどこへ向かう?", icon: "🗣️", barClass: "bg-mode-question" },
  { key: "citizen", label: "市民モード", theme: "このお金は私たちの暮らしに?", icon: "🏠", barClass: "bg-mode-citizen" },
];

const MODE_ACTIVE_BG: Record<ViewMode, string> = {
  budget: "bg-blue-50 text-mode-budget",
  settlement: "bg-green-50 text-mode-settlement",
  question: "bg-orange-50 text-mode-question",
  citizen: "bg-pink-50 text-mode-citizen",
};

/**
 * 左サイドバー。事業ページ上では現在のURLクエリ(?mode=)をそのまま書き換え、
 * それ以外のページ(トップ等)ではdefaultProjectIdへ遷移してモードを指定する。
 * モバイルではハンバーガーメニューでオーバーレイ表示する(AppHeaderのメニューボタンと連動はP2)。
 */
export function Sidebar({
  currentProjectId,
  defaultProjectId,
}: {
  currentProjectId?: string;
  defaultProjectId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeMode = (searchParams.get("mode") as ViewMode) || (currentProjectId ? "budget" : null);

  function goToMode(mode: ViewMode) {
    if (currentProjectId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", mode);
      router.replace(`${pathname}?${params.toString()}`);
    } else if (defaultProjectId) {
      router.push(`/projects/${defaultProjectId}/?mode=${mode}`);
    }
    setMobileOpen(false);
  }

  const body = (
    <nav aria-label="モード・メニュー" className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        onClick={() => setMobileOpen(false)}
      >
        ホーム
      </Link>

      <p className="mt-3 px-3 text-xs font-semibold text-slate-400">事業を見る視点</p>
      {MODES.map((m) => {
        const isActive = activeMode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => goToMode(m.key)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-col items-start rounded-lg px-3 py-2 text-left transition ${
              isActive ? MODE_ACTIVE_BG[m.key] : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isActive && (
              <span aria-hidden className={`absolute left-0 top-1 bottom-1 w-1 rounded-full ${m.barClass}`} />
            )}
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden>{m.icon}</span>
              {m.label}
            </span>
            <span className="pl-6 text-xs text-slate-400">「{m.theme}」</span>
          </button>
        );
      })}

      <hr className="my-3 border-slate-200" />

      {["事業を探す", "分野から探す", "用語集", "データについて"].map((label) => (
        <span
          key={label}
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
        >
          {label}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">準備中</span>
        </span>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        {body}
      </aside>

      <div className="border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <span aria-hidden>☰</span>
          メニュー
        </button>
        {mobileOpen && (
          <div id="mobile-sidebar" className="mt-2 rounded-xl border border-slate-200 bg-white shadow-lg">
            {body}
          </div>
        )}
      </div>
    </>
  );
}
