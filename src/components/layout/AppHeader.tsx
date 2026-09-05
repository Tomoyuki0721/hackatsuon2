import Link from "next/link";

/**
 * サイト共通ヘッダー。自治体公式サイトとしての信頼感を保ちつつ、
 * 古い行政サイトの見た目にはしない(白〜淡い水色背景、控えめな装飾)。
 */
export function AppHeader() {
  return (
    <header className="relative border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #2a78d6 0, transparent 40%), radial-gradient(circle at 85% 0%, #1baf7a 0, transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xs font-medium tracking-wide text-slate-500">気仙沼市</span>
          <span className="text-base font-bold text-slate-900 sm:text-lg">まちの予算・決算見える化</span>
        </Link>

        <form
          role="search"
          className="ml-auto hidden max-w-md flex-1 items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 shadow-sm md:flex"
        >
          <span aria-hidden className="mr-2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="事業名・キーワードで探す"
            aria-label="事業名・キーワードで探す"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </form>

        <nav className="flex items-center gap-1 text-sm text-slate-600 sm:gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mode-budget"
          >
            使い方
          </button>
          <button
            type="button"
            aria-label="お気に入り"
            className="rounded-md px-2 py-1.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mode-budget"
          >
            <span aria-hidden>☆</span>
          </button>
          <button
            type="button"
            aria-label="メニュー"
            className="rounded-md px-2 py-1.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mode-budget md:hidden"
          >
            <span aria-hidden>☰</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
