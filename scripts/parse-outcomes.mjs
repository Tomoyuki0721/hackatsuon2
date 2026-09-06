#!/usr/bin/env node
/**
 * 「主要な施策の成果に関する説明書」のテキストから、事業ごとの候補データを取り出す
 * (パイプラインの 自動抽出 → 正規化 段階)。
 *
 *   node scripts/parse-outcomes.mjs --in data/raw/17主要な施策の成果説明書.txt --year R4 --doc R4成果報告書
 *
 * 出力は data/candidates/<doc>.json。**確定データではない**。
 * 人が中身を確認し、必要な項目を data/projects/<projectId>.json へ取り込む前提。
 *
 * 抽出できなかった項目は null のままにし、推測で埋めない。
 * 不確かな点は各候補の _review に理由を残す。
 *
 * 財源内訳について:
 *   このシートは「予算の執行状況／決算額の財源内訳」欄の数値が、テキスト抽出後は
 *   [予算額, 決算額, 国(県)支出金, 市債, その他, 一般財源] の順で並ぶ。
 *   複数年度・複数事業のシートで確認した並びだが、欄と数値の対応が崩れる例もあるため、
 *   後ろ4つの合計が決算額と一致するかを必ず検算し、合わなければ信頼度を下げて _review に残す。
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { in: null, year: null, doc: null, out: path.join(process.cwd(), "data", "candidates") };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--in") args.in = path.resolve(argv[++i]);
    else if (argv[i] === "--year") args.year = argv[++i];
    else if (argv[i] === "--doc") args.doc = argv[++i];
    else if (argv[i] === "--out") args.out = path.resolve(argv[++i]);
    else {
      console.error(`不明な引数: ${argv[i]}`);
      process.exit(1);
    }
  }
  if (!args.in || !args.year || !args.doc) {
    console.error("使い方: node scripts/parse-outcomes.mjs --in <txt> --year <R4|R6|R7> --doc <R4成果報告書 等>");
    process.exit(1);
  }
  return args;
}

/** 全角スペース・改行のゆらぎをならす(数値や語の判定を安定させるため)。 */
function normalize(text) {
  return text.replace(/　/g, " ").replace(/[ \t]+/g, " ");
}

/** 目次から「事業名 → 掲載ページ」を作る。本文中の「決算書ページ」は別資料のページなので使わない。 */
function buildTocMap(text) {
  const map = new Map();
  const re = /([^\s·・．\.]{3,40}?)\s*[·・．\.]{4,}\s*(\d{1,3})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    const page = m[2];
    if (!map.has(name)) map.set(name, page);
  }
  return map;
}

function pick(block, re) {
  const m = block.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

/** 「予算の執行状況」欄の数値を取り出す。 */
function parseFinance(block) {
  const start = block.indexOf("予算の執行状況");
  if (start === -1) return null;

  const endCandidates = ["成 果 と", "【成果】", "【課題】"]
    .map((k) => block.indexOf(k, start))
    .filter((i) => i !== -1);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : block.length;

  const region = block.slice(start, end);
  const numbers = (region.match(/\d{1,3}(?:,\d{3})+|(?<![\d,])0(?![\d,])/g) ?? []).map((n) =>
    Number(n.replace(/,/g, ""))
  );

  if (numbers.length < 6) return { numbers, incomplete: true };

  const [budget, settlement, nationalGrant, municipalBond, other, generalFund] = numbers;
  const sum = nationalGrant + municipalBond + other + generalFund;

  return {
    budget,
    settlement,
    nationalGrant,
    municipalBond,
    other,
    generalFund,
    sumMatches: sum === settlement,
    sum,
    extraNumbers: numbers.length > 6 ? numbers.slice(6) : [],
  };
}

function sourced(value, doc, page, text, confidence) {
  if (value === null || value === undefined) {
    return { value: null, citation: null, confidence: "低" };
  }
  return {
    value,
    citation: { sourceDocument: doc, sourcePage: page, sourceText: text ?? null },
    confidence,
  };
}

function parseBlock(block, { year, doc, tocMap }) {
  const name = pick(block, /事 業 名\s*(?:等\s*)?([^\n]+)/);
  if (!name) return null;

  // 「一般行政経費」「職員人件費」等の共通経費は事業マスターの対象外(matching-rules.md)
  const EXCLUDED = ["一般行政経費", "職員人件費", "安全衛生管理費", "施設の維持管理"];
  const excluded = EXCLUDED.some((k) => name.includes(k));

  const review = [];
  const page = tocMap.get(name) ?? null;
  if (!page) review.push("目次から掲載ページを特定できませんでした(citation の sourcePage が null です)");

  const finance = parseFinance(block);
  if (!finance) review.push("「予算の執行状況」欄が見つかりませんでした");
  else if (finance.incomplete) review.push(`財源欄の数値が6個未満です(${finance.numbers?.join(", ")})`);
  else if (!finance.sumMatches) {
    review.push(
      `財源内訳の合計(${finance.sum})が決算額(${finance.settlement})と一致しません。欄と数値の対応を原典で確認してください`
    );
  }
  if (finance?.extraNumbers?.length) {
    review.push(`財源欄に想定より多い数値があります(余り: ${finance.extraNumbers.join(", ")})`);
  }

  const financeConfidence = finance && !finance.incomplete && finance.sumMatches ? "高" : "低";

  const purpose = pick(block, /【目的】\s*([\s\S]*?)(?=【事業内容】|【成果】|実施状況|$)/);
  const overview = pick(block, /【事業内容】\s*([\s\S]*?)(?=【成果】|【課題】|実施状況|予算の執行状況|$)/);
  const outcome = pick(block, /【成果】\s*([\s\S]*?)(?=【課題】|-\s*\d+\s*-|$)/);
  const issue = pick(block, /【課題】\s*([\s\S]*?)(?=-\s*\d+\s*-|所 管 課|$)/);

  if (!purpose) review.push("【目的】を抽出できませんでした");
  if (!outcome) review.push("【成果】を抽出できませんでした");
  if (!issue) review.push("【課題】の記載がない、または抽出できませんでした");

  return {
    _candidate: true,
    _review: review,
    _excludedAsCommonExpense: excluded,
    rawName: name,
    year,
    department: pick(block, /所 管 課\s*([^\n]*?)(?=\s*予算科目|$)/),
    budgetCategory: pick(block, /予算科目\s*([^\n]+)/),
    policyCategory: pick(block, /総計基本施策分類\s*(?:〈[^〉]*〉)?\s*([^\n]+)/),
    settlementBookPage: pick(block, /決算書ページ\s*([\d～〜~\-]+)/),
    sourcePage: page,

    purpose: sourced(purpose, doc, page, purpose, purpose ? "高" : "低"),
    overview: sourced(overview, doc, page, overview, overview ? "高" : "低"),

    budget: {
      initial: { value: null, citation: null, confidence: "低" },
      supplementary: { value: null, citation: null, confidence: "低" },
      final: sourced(finance?.budget ?? null, doc, page, finance ? `予算額 ${finance.budget?.toLocaleString()}` : null, financeConfidence),
      previousYear: { value: null, citation: null, confidence: "低" },
    },
    settlement: {
      amount: sourced(finance?.settlement ?? null, doc, page, finance ? `決算額 ${finance.settlement?.toLocaleString()}` : null, financeConfidence),
      unspent: { value: null, citation: null, confidence: "低" },
      executionRate: { value: null, citation: null, confidence: "低" },
    },
    funding: {
      nationalGrant: sourced(finance?.nationalGrant ?? null, doc, page, "国(県)支出金", financeConfidence),
      prefecturalGrant: { value: 0, citation: null, confidence: "中" },
      municipalBond: sourced(finance?.municipalBond ?? null, doc, page, "市債", financeConfidence),
      fund: { value: 0, citation: null, confidence: "中" },
      other: sourced(finance?.other ?? null, doc, page, "その他", financeConfidence),
      generalFund: sourced(finance?.generalFund ?? null, doc, page, "一般財源", financeConfidence),
    },
    outputOutcome: {
      outputs: [],
      outcomes: [],
      kpiAchievementRate: null,
      qualitativeOutcome: sourced(outcome, doc, page, outcome, outcome ? "高" : "低"),
    },
    issuesAndResponse: {
      issue: sourced(issue, doc, page, issue, issue ? "高" : "低"),
      nextYearResponse: { value: null, citation: null, confidence: "低" },
    },
    newInitiatives: [],
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.in)) {
    console.error(`ファイルがありません: ${args.in}`);
    process.exit(1);
  }

  const text = normalize(fs.readFileSync(args.in, "utf-8"));
  const tocMap = buildTocMap(text);

  const blocks = text.split(/(?=所 管 課)/).filter((b) => b.includes("事 業 名"));
  const candidates = blocks
    .map((b) => parseBlock(b, { year: args.year, doc: args.doc, tocMap }))
    .filter((c) => c !== null);

  fs.mkdirSync(args.out, { recursive: true });
  const outFile = path.join(args.out, `${args.doc}.json`);
  fs.writeFileSync(outFile, JSON.stringify(candidates, null, 2) + "\n", "utf-8");

  const withReview = candidates.filter((c) => c._review.length > 0).length;
  const excluded = candidates.filter((c) => c._excludedAsCommonExpense).length;

  console.log(`目次から ${tocMap.size} 件の掲載ページを取得`);
  console.log(`${candidates.length} 件の事業候補を抽出 → ${path.relative(process.cwd(), outFile)}`);
  console.log(`  うち要確認: ${withReview} 件 / 共通経費として除外候補: ${excluded} 件`);
  console.log(`\nこれは候補データです。原典と突き合わせて確認のうえ data/projects/ に取り込んでください。`);
}

main();
