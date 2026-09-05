"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DetailLevel, FiscalYear, ProjectData, ViewMode } from "@/types/project";
import { latestYearRecord } from "@/lib/project-helpers";
import { AppShell } from "./layout/AppShell";
import { ProjectView } from "./ProjectView";

const VALID_MODES: ViewMode[] = ["budget", "settlement", "question", "citizen"];
const VALID_VIEWS: DetailLevel[] = ["normal", "detail"];

/**
 * 事業ページの状態(mode/view/year)を一箇所で保持し、Sidebarとメインコンテンツの
 * 両方に配る。あえてuseSearchParamsを使わず、初回はサーバーと同じデフォルト値で描画し、
 * マウント後にuseEffectで実URLを読んで反映する。
 *
 * 理由: 静的書き出し(output:"export")では、Suspense配下でuseSearchParamsを使うコンポーネントは
 * Next.jsによって「BAILOUT_TO_CLIENT_SIDE_RENDERING」扱いになり、静的HTMLに何も描画されない
 * (JSが読み込まれるまで画面が空白になる)。この方式ならサーバー・クライアントの初回描画が
 * 一致するため静的HTMLにも実コンテンツが出力され、深いリンク(?mode=...)はマウント後に反映される。
 */
export function ProjectPageClient({ data }: { data: ProjectData }) {
  const router = useRouter();
  const pathname = usePathname();
  const defaultYear = latestYearRecord(data)?.year ?? data.years[0]?.year;

  const [mode, setMode] = useState<ViewMode>("budget");
  const [view, setView] = useState<DetailLevel>("normal");
  const [year, setYear] = useState<FiscalYear | undefined>(defaultYear);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    const v = params.get("view");
    const y = params.get("year");
    if (m && (VALID_MODES as string[]).includes(m)) setMode(m as ViewMode);
    if (v && (VALID_VIEWS as string[]).includes(v)) setView(v as DetailLevel);
    if (y && data.years.some((yr) => yr.year === y)) setYear(y as FiscalYear);
    // 初回マウント時のみ実行する(実URLの反映は1回だけでよい)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncUrl(next: { mode?: ViewMode; view?: DetailLevel; year?: FiscalYear }) {
    const params = new URLSearchParams(window.location.search);
    if (next.mode) params.set("mode", next.mode);
    if (next.view) params.set("view", next.view);
    if (next.year) params.set("year", next.year);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleModeChange(m: ViewMode) {
    setMode(m);
    syncUrl({ mode: m });
  }
  function handleViewChange(v: DetailLevel) {
    setView(v);
    syncUrl({ view: v });
  }
  function handleYearChange(y: FiscalYear) {
    setYear(y);
    syncUrl({ year: y });
  }

  return (
    <AppShell
      currentProjectId={data.master.projectId}
      defaultProjectId={data.master.projectId}
      mode={mode}
      onModeChange={handleModeChange}
    >
      <ProjectView
        data={data}
        mode={mode}
        view={view}
        year={(year ?? defaultYear) as FiscalYear}
        onChangeView={handleViewChange}
        onChangeYear={handleYearChange}
      />
    </AppShell>
  );
}
