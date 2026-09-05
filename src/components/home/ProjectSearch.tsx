"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectAnalysis } from "@/lib/analysis";
import { formatPercent, formatSignedPercent, formatYen } from "@/lib/format";

const ALL = "すべて";

/**
 * 事業の検索・絞り込み。事業名/キーワード/所管課/政策分野/款/年度で絞り込む。
 * 検索対象には事業名・別名・所管・政策分野・予算科目に加え、主な事業内容の本文も含める。
 */
export function ProjectSearch({ analyses }: { analyses: ProjectAnalysis[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [policy, setPolicy] = useState(ALL);
  const [section, setSection] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const options = useMemo(() => {
    const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
    return {
      departments: uniq(analyses.map((a) => a.department)),
      policies: uniq(analyses.map((a) => a.policyCategory)),
      sections: uniq(analyses.map((a) => a.budgetSection)),
      years: uniq(analyses.flatMap((a) => a.years)),
    };
  }, [analyses]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyses.filter((a) => {
      if (q && !a.searchText.includes(q)) return false;
      if (department !== ALL && a.department !== department) return false;
      if (policy !== ALL && a.policyCategory !== policy) return false;
      if (section !== ALL && a.budgetSection !== section) return false;
      if (year !== ALL && !a.years.includes(year as ProjectAnalysis["years"][number])) return false;
      return true;
    });
  }, [analyses, query, department, policy, section, year]);

  const filtered = query || department !== ALL || policy !== ALL || section !== ALL || year !== ALL;

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2">
          <span aria-hidden className="text-slate-400">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="事業名・キーワードで探す(例: 空き家、移住、補助金)"
            aria-label="事業名・キーワードで探す"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="所管課" value={department} onChange={setDepartment} options={options.departments} />
          <Select label="政策分野" value={policy} onChange={setPolicy} options={options.policies} />
          <Select label="款" value={section} onChange={setSection} options={options.sections} />
          <Select label="年度" value={year} onChange={setYear} options={options.years} />
        </div>

        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDepartment(ALL);
              setPolicy(ALL);
              setSection(ALL);
              setYear(ALL);
            }}
            className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
          >
            絞り込みを解除する
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {results.length}件の事業{filtered && `(全${analyses.length}件中)`}
      </p>

      <ul className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {results.map((a) => (
          <li key={a.projectId}>
            <ProjectCard analysis={a} />
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          条件に合う事業がありません。
        </p>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mode-budget"
      >
        <option value={ALL}>{ALL}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProjectCard({ analysis: a }: { analysis: ProjectAnalysis }) {
  return (
    <Link
      href={`/projects/${a.projectId}/`}
      className="block h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-mode-budget hover:shadow-md"
    >
      <p className="text-xs text-slate-500">
        {a.department} / {a.section}
      </p>
      <p className="mt-1 font-bold text-slate-900">{a.name}</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          {a.latestBudgetYear}年度予算{" "}
          <strong className="tabular-nums text-slate-900">{formatYen(a.latestBudget)}</strong>
          {a.budgetGrowth !== null && (
            <span className={a.budgetGrowth > 0 ? "ml-1 text-rose-600" : "ml-1 text-blue-600"}>
              {formatSignedPercent(a.budgetGrowth)}
            </span>
          )}
        </span>
        {a.executionRate !== null && (
          <span>
            {a.latestSettlementYear}年度執行率{" "}
            <strong className="tabular-nums text-slate-900">{formatPercent(a.executionRate)}</strong>
          </span>
        )}
      </div>

      {a.flags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {a.flags.map((f) => (
            <li
              key={f.kind}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
              title={f.detail}
            >
              <span aria-hidden>▲</span>
              {f.label}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-slate-400">{a.budgetCategory}</p>
    </Link>
  );
}
