import type { ReactNode } from "react";
import type { ViewMode } from "@/types/project";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

/**
 * ヘッダー+左サイドバー+コンテンツのグリッドを組む共通レイアウト。
 *
 * mode/onModeChangeを渡すと(事業ページ内)、サイドバーのモードリンクはそのpropsを直接使って
 * ページ内で状態を切り替える。渡さない場合(トップページ等)はdefaultProjectIdへ遷移して
 * モードを指定したURLを開く。
 *
 * 注意: ここでuseSearchParams等のルーティングhookを使わないのは意図的。
 * 静的書き出し(output: "export")では、Suspense配下でuseSearchParamsを使うと
 * Next.jsがそのサブツリーを「BAILOUT_TO_CLIENT_SIDE_RENDERING」として
 * 静的HTMLに一切描画しなくなり(JS読み込みまで画面が空白になる)、
 * GitHub Pages上で「表示が壊れている」ように見える原因になっていたため、
 * 状態は親(ProjectPageClient)がuseStateで持ち、propsで受け渡す方式に変更した。
 */
export function AppShell({
  children,
  currentProjectId,
  defaultProjectId,
  mode,
  onModeChange,
}: {
  children: ReactNode;
  currentProjectId?: string;
  defaultProjectId: string | null;
  mode?: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar
          currentProjectId={currentProjectId}
          defaultProjectId={defaultProjectId}
          mode={mode}
          onModeChange={onModeChange}
        />
        <main className="min-w-0 flex-1 bg-[#f7f9fb]">{children}</main>
      </div>
    </div>
  );
}
