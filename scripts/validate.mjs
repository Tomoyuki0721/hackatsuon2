#!/usr/bin/env node
/**
 * 事業データ(data/projects/*.json)の検証。
 *
 * 手作業で抽出したデータにも、スクリプトが生成した候補データにも同じ規則を課す。
 * 特に「出典の無い数値が事実として入り込んでいないか」を機械的に確かめることが目的。
 * CI(.github/workflows/deploy.yml)でビルド前に実行され、失敗するとデプロイされない。
 *
 *   node scripts/validate.mjs
 */

import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

const FISCAL_YEARS = ["R4", "R5", "R6", "R7", "R8"];
const CONFIDENCES = ["高", "中", "低"];
const STATUSES = ["継続", "新規", "拡充", "縮小", "終了", "統合", "分割"];
const INITIATIVE_LABELS = ["NEW", "拡充", "対象拡大", "制度変更"];
const SOURCE_DOCUMENTS = [
  "R4決算書", "R6決算書", "R7決算書",
  "R6予算書", "R8予算書",
  "R6予算説明資料", "R7予算説明資料", "R8予算説明資料",
  "R4成果報告書", "R6成果報告書", "R7成果報告書",
];
const FUNDING_KEYS = [
  "nationalGrant", "prefecturalGrant", "municipalBond", "fund", "other", "generalFund",
];

const errors = [];
const warnings = [];

function err(file, message) {
  errors.push(`${file}: ${message}`);
}
function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

/** Sourced<T> の形を検証する。値があるのに出典も信頼度の但し書きも無い、という状態を弾く。 */
function checkSourced(file, where, field, { allowNull = true } = {}) {
  if (field === null || field === undefined) {
    if (!allowNull) err(file, `${where}: 必須項目が存在しません`);
    return;
  }
  if (typeof field !== "object") {
    err(file, `${where}: Sourced<T> ではありません`);
    return;
  }
  if (!("value" in field) || !("citation" in field) || !("confidence" in field)) {
    err(file, `${where}: value / citation / confidence のいずれかが欠けています`);
    return;
  }
  if (!CONFIDENCES.includes(field.confidence)) {
    err(file, `${where}: confidence が不正です (${field.confidence})`);
  }

  const c = field.citation;
  if (c !== null) {
    if (typeof c !== "object") {
      err(file, `${where}: citation の形が不正です`);
    } else {
      if (!SOURCE_DOCUMENTS.includes(c.sourceDocument)) {
        err(file, `${where}: 未知の sourceDocument (${c.sourceDocument})`);
      }
      if (c.sourcePage !== null && typeof c.sourcePage !== "string") {
        err(file, `${where}: sourcePage は文字列か null にしてください`);
      }
      if (c.sourceText !== null && typeof c.sourceText !== "string") {
        err(file, `${where}: sourceText は文字列か null にしてください`);
      }
    }
  }

  // 中核の規則: 値があって信頼度「高」なら、出典が必ず要る。
  // 出典を出せないものは「中」以下にするか、値を null にすること。
  if (field.value !== null && field.confidence === "高" && c === null) {
    err(file, `${where}: 信頼度「高」なのに出典がありません(値=${field.value})`);
  }
}

function checkMetric(file, where, metric) {
  if (typeof metric?.label !== "string" || metric.label === "") {
    err(file, `${where}: label がありません`);
  }
  checkSourced(file, `${where}.value`, metric?.value, { allowNull: false });
  if (metric?.numericValue !== undefined && metric.numericValue !== null) {
    if (typeof metric.numericValue !== "number" || Number.isNaN(metric.numericValue)) {
      err(file, `${where}: numericValue が数値ではありません`);
    }
  }
}

function checkYear(file, record, seenYears) {
  const y = record.year;
  const where = `${y}`;

  if (!FISCAL_YEARS.includes(y)) {
    err(file, `不正な年度: ${y}`);
    return;
  }
  if (seenYears.has(y)) err(file, `年度 ${y} が重複しています`);
  seenYears.add(y);

  if (!STATUSES.includes(record.status)) {
    err(file, `${where}: status が不正です (${record.status})`);
  }

  checkSourced(file, `${where}.purpose`, record.purpose);
  checkSourced(file, `${where}.overview`, record.overview);

  if (record.budget) {
    for (const k of ["initial", "supplementary", "final", "previousYear"]) {
      checkSourced(file, `${where}.budget.${k}`, record.budget[k], { allowNull: false });
    }
  }

  if (record.settlement) {
    for (const k of ["amount", "unspent", "executionRate"]) {
      checkSourced(file, `${where}.settlement.${k}`, record.settlement[k], { allowNull: false });
    }
  }

  if (record.funding) {
    for (const k of FUNDING_KEYS) {
      checkSourced(file, `${where}.funding.${k}`, record.funding[k], { allowNull: false });
    }

    // 財源内訳の合計は決算額と一致するはず。ずれる場合は原典側の注記が必要。
    const settled = record.settlement?.amount?.value ?? null;
    if (settled !== null) {
      const values = FUNDING_KEYS.map((k) => record.funding[k]?.value);
      if (values.every((v) => v !== null && v !== undefined)) {
        const sum = values.reduce((a, b) => a + b, 0);
        if (sum !== settled) {
          const hasNote = Object.keys(record).some((k) => k.startsWith("_note"));
          const message = `${where}: 財源内訳の合計(${sum})が決算額(${settled})と一致しません`;
          if (hasNote) warn(file, `${message} — _note による説明あり`);
          else err(file, message);
        }
      }
    }
  }

  if (record.implementation) {
    for (const group of ["mainSubProjects", "newSubProjects", "expandedSubProjects", "discontinuedSubProjects"]) {
      const items = record.implementation[group];
      if (!Array.isArray(items)) {
        err(file, `${where}.implementation.${group}: 配列ではありません`);
        continue;
      }
      items.forEach((item, i) => checkSourced(file, `${where}.implementation.${group}[${i}]`, item, { allowNull: false }));
    }
  }

  if (record.outputOutcome) {
    for (const group of ["outputs", "outcomes"]) {
      const items = record.outputOutcome[group];
      if (!Array.isArray(items)) {
        err(file, `${where}.outputOutcome.${group}: 配列ではありません`);
        continue;
      }
      items.forEach((m, i) => checkMetric(file, `${where}.outputOutcome.${group}[${i}]`, m));
    }
    checkSourced(file, `${where}.outputOutcome.kpiAchievementRate`, record.outputOutcome.kpiAchievementRate);
    checkSourced(file, `${where}.outputOutcome.qualitativeOutcome`, record.outputOutcome.qualitativeOutcome);
  }

  if (record.issuesAndResponse) {
    checkSourced(file, `${where}.issuesAndResponse.issue`, record.issuesAndResponse.issue);
    checkSourced(file, `${where}.issuesAndResponse.nextYearResponse`, record.issuesAndResponse.nextYearResponse);
  }

  if (!Array.isArray(record.newInitiatives)) {
    err(file, `${where}.newInitiatives: 配列ではありません`);
  } else {
    record.newInitiatives.forEach((ni, i) => {
      const w = `${where}.newInitiatives[${i}]`;
      if (typeof ni.name !== "string" || ni.name === "") err(file, `${w}: name がありません`);
      if (!FISCAL_YEARS.includes(ni.startYear)) err(file, `${w}: startYear が不正です (${ni.startYear})`);
      if (!INITIATIVE_LABELS.includes(ni.label)) err(file, `${w}: label が不正です (${ni.label})`);
      for (const k of ["budget", "funding", "purpose", "targetAudience", "content", "expectedOutcome"]) {
        checkSourced(file, `${w}.${k}`, ni[k], { allowNull: false });
      }
    });
  }
}

function validateFile(filePath) {
  const file = path.basename(filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    err(file, `JSONとして読めません: ${e.message}`);
    return;
  }

  const m = data.master;
  if (!m) {
    err(file, "master がありません");
    return;
  }
  for (const k of ["projectId", "canonicalName", "department", "section", "policyCategory", "budgetCategory"]) {
    if (typeof m[k] !== "string" || m[k] === "") err(file, `master.${k} が空です`);
  }
  if (!Array.isArray(m.aliases)) err(file, "master.aliases が配列ではありません");

  const expectedFile = `${m.projectId}.json`;
  if (file !== expectedFile) {
    err(file, `ファイル名が projectId と一致しません(期待: ${expectedFile})`);
  }

  if (!Array.isArray(data.years) || data.years.length === 0) {
    err(file, "years が空です");
    return;
  }

  const seenYears = new Set();
  data.years.forEach((record) => checkYear(file, record, seenYears));

  // 年度は昇順で並んでいることを期待する(画面側でソートするが、データ側も揃える)
  const order = data.years.map((r) => FISCAL_YEARS.indexOf(r.year));
  const sorted = [...order].sort((a, b) => a - b);
  if (order.join() !== sorted.join()) {
    warn(file, "years が年度順に並んでいません");
  }
}

const COUNCIL_FILE = path.join(process.cwd(), "data", "council", "qa.json");
const ANSWER_STATUSES = ["実施済", "一部実施", "継続検討", "実施しない", "未確認"];
const QA_CATEGORIES = ["一般質問", "予算・決算審査の質疑", "議案審議"];

/** 議会の質疑応答データの検証。出典URLと紐付け先の事業が実在することを確かめる。 */
function validateCouncil(knownProjectIds) {
  if (!fs.existsSync(COUNCIL_FILE)) return 0;
  const file = "council/qa.json";

  let items;
  try {
    items = JSON.parse(fs.readFileSync(COUNCIL_FILE, "utf-8"));
  } catch (e) {
    err(file, `JSONとして読めません: ${e.message}`);
    return 0;
  }
  if (!Array.isArray(items)) {
    err(file, "配列ではありません");
    return 0;
  }

  const seenIds = new Set();
  items.forEach((qa, i) => {
    const where = qa.id ?? `[${i}]`;
    if (typeof qa.id !== "string" || qa.id === "") err(file, `${where}: id がありません`);
    if (seenIds.has(qa.id)) err(file, `${where}: id が重複しています`);
    seenIds.add(qa.id);

    if (!QA_CATEGORIES.includes(qa.category)) err(file, `${where}: category が不正です (${qa.category})`);
    if (!ANSWER_STATUSES.includes(qa.answerStatus)) {
      err(file, `${where}: answerStatus が不正です (${qa.answerStatus})`);
    }
    for (const k of ["issue", "meetingLabel", "publishedOn", "question", "sourceDocument"]) {
      if (typeof qa[k] !== "string" || qa[k] === "") err(file, `${where}: ${k} が空です`);
    }

    // 出典が辿れないものは載せない
    if (typeof qa.sourceUrl !== "string" || !qa.sourceUrl.startsWith("https://")) {
      err(file, `${where}: sourceUrl が https のURLではありません`);
    }

    // 「実施済」「一部実施」と断定するなら、その根拠を statusNote に書く
    if (["実施済", "一部実施", "実施しない"].includes(qa.answerStatus) && !qa.statusNote) {
      err(file, `${where}: answerStatus「${qa.answerStatus}」には根拠を statusNote に書いてください`);
    }

    if (!Array.isArray(qa.relatedProjectIds)) {
      err(file, `${where}: relatedProjectIds が配列ではありません`);
    } else {
      for (const id of qa.relatedProjectIds) {
        if (!knownProjectIds.has(id)) err(file, `${where}: 存在しない事業を参照しています (${id})`);
      }
      if (qa.relatedProjectIds.length === 0) {
        warn(file, `${where}: どの事業にも紐づいていません`);
      }
    }
  });

  return items.length;
}

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`事業データのディレクトリがありません: ${PROJECTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("検証対象の事業データがありません");
    process.exit(1);
  }

  files.forEach((f) => validateFile(path.join(PROJECTS_DIR, f)));

  const projectIds = new Set(files.map((f) => f.replace(/\.json$/, "")));
  const qaCount = validateCouncil(projectIds);

  console.log(`検証対象: 事業 ${files.length}件 / 議会質疑 ${qaCount}件`);

  if (warnings.length > 0) {
    console.log(`\n警告 ${warnings.length}件:`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  if (errors.length > 0) {
    console.error(`\nエラー ${errors.length}件:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("\n検証OK: 出典・信頼度・財源内訳の整合性に問題はありません。");
}

main();
