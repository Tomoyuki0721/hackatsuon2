import { Suspense } from "react";
import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

/**
 * ヘッダー+左サイドバー+コンテンツのグリッドを組む共通レイアウト。
 * currentProjectIdを渡すと、サイドバーのモードリンクがそのページ内で?modeを切り替える。
 * 渡さない場合(トップページ等)はdefaultProjectIdへ遷移してモードを開く。
 */
export function AppShell({
  children,
  currentProjectId,
  defaultProjectId,
}: {
  children: ReactNode;
  currentProjectId?: string;
  defaultProjectId: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <Suspense fallback={null}>
          <Sidebar currentProjectId={currentProjectId} defaultProjectId={defaultProjectId} />
        </Suspense>
        <main className="min-w-0 flex-1 bg-[#f7f9fb]">{children}</main>
      </div>
    </div>
  );
}
