#!/usr/bin/env node
/**
 * 候補データの事業名を、既存の事業マスターに突き合わせる(パイプラインの 候補マッチング 段階)。
 *
 *   node scripts/match-projects.mjs --candidates data/candidates/R7成果報告書.json
 *
 * matching-rules.md の規則に従う:
 *   1. exact  … 正式名称と完全一致
 *   2. alias  … 別名と一致
 *   3. fuzzy  … 表記ゆれを吸収したうえで一致(要確認)
 *   4. manual … 自動では決められない。人が判断する
 *
 * 重要: 事業名が同じでも「款」が異なる場合は別事業として扱う
 * (例: 地域おこし協力隊事業は 2款/5款/7款 にそれぞれ存在する)。
 * 判定結果を出力するだけで、データの書き換えは行わない。
 */

import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

function parseArgs(argv) {
  const args = { candidates: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--candidates") args.candidates = path.resolve(argv[++i]);
    else {
      console.error(`不明な引数: ${argv[i]}`);
      process.exit(1);
    }
  }
  if (!args.candidates) {
    console.error("使い方: node scripts/match-projects.mjs --candidates data/candidates/<file>.json");
    process.exit(1);
  }
  return args;
}

/** 表記ゆれの吸収: 全角括弧・記号・空白を落として比較する。 */
function fold(name) {
  return (name ?? "")
    .replace(/[（）()\[\]「」『』]/g, "")
    .replace(/[・･]/g, "")
    .replace(/\s/g, "")
    .replace(/ヶ/g, "ケ")
    .toLowerCase();
}

/** 「２款　１項　７目　企画調査費」から「2款」を取り出す。全角数字にも対応。 */
function sectionOf(budgetCategory) {
  const zenkaku = "０１２３４５６７８９";
  const normalized = (budgetCategory ?? "").replace(/[０-９]/g, (c) => String(zenkaku.indexOf(c)));
  return normalized.match(/(\d+)\s*款/)?.[1] ?? null;
}

function loadMasters() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf-8")).master);
}

function matchOne(candidate, masters) {
  const candSection = sectionOf(candidate.budgetCategory);
  const candFolded = fold(candidate.rawName);

  const sameSection = (m) => {
    const s = sectionOf(m.budgetCategory);
    return s === null || candSection === null || s === candSection;
  };

  for (const m of masters) {
    if (m.canonicalName === candidate.rawName && sameSection(m)) {
      return { method: "exact", projectId: m.projectId, confidence: "高" };
    }
  }
  for (const m of masters) {
    if ((m.aliases ?? []).includes(candidate.rawName) && sameSection(m)) {
      return { method: "alias", projectId: m.projectId, confidence: "高" };
    }
  }
  for (const m of masters) {
    const hit = fold(m.canonicalName) === candFolded || (m.aliases ?? []).some((a) => fold(a) === candFolded);
    if (hit && sameSection(m)) {
      return { method: "fuzzy", projectId: m.projectId, confidence: "中" };
    }
  }

  // 名前は一致するが款が違う = 別事業。取り違えないよう明示する。
  const sameNameOtherSection = masters.find(
    (m) => fold(m.canonicalName) === candFolded && !sameSection(m)
  );
  if (sameNameOtherSection) {
    return {
      method: "manual",
      projectId: null,
      confidence: "低",
      note: `同名の事業 ${sameNameOtherSection.projectId} が存在しますが款が異なります(候補=${candSection}款 / 既存=${sectionOf(sameNameOtherSection.budgetCategory)}款)。別事業として新規に作成してください。`,
    };
  }

  return { method: "manual", projectId: null, confidence: "低", note: "既存の事業マスターに該当なし" };
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.candidates)) {
    console.error(`ファイルがありません: ${args.candidates}`);
    process.exit(1);
  }

  const candidates = JSON.parse(fs.readFileSync(args.candidates, "utf-8"));
  const masters = loadMasters();
  console.log(`事業マスター ${masters.length} 件 / 候補 ${candidates.length} 件\n`);

  const counts = { exact: 0, alias: 0, fuzzy: 0, manual: 0 };
  const rows = [];

  for (const c of candidates) {
    if (c._excludedAsCommonExpense) continue;
    const result = matchOne(c, masters);
    counts[result.method]++;
    rows.push({ name: c.rawName, section: sectionOf(c.budgetCategory), ...result });
  }

  for (const r of rows) {
    if (r.method === "manual") continue;
    console.log(`  [${r.method}] ${r.name} → ${r.projectId}`);
  }

  const manual = rows.filter((r) => r.method === "manual");
  if (manual.length > 0) {
    console.log(`\n人の判断が必要なもの (${manual.length}件):`);
    for (const r of manual) {
      console.log(`  - ${r.name} (${r.section ?? "款不明"}款): ${r.note}`);
    }
  }

  console.log(
    `\n内訳: exact ${counts.exact} / alias ${counts.alias} / fuzzy ${counts.fuzzy} / manual ${counts.manual}`
  );
  console.log("fuzzy と manual は必ず人が確認してください(自動で確定データに書き込みません)。");
}

main();
