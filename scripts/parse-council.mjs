#!/usr/bin/env node
/**
 * 議会だよりのテキストから、予算審査の質疑応答(Q/A)を候補として取り出す。
 *
 *   node scripts/parse-council.mjs [--in data/raw/council] [--out data/candidates]
 *
 * できること・できないことをはっきりさせておく:
 *   ○ 予算審査・決算審査の「主な質疑」— 横書きのQ/A形式で、抽出できる
 *   × 一般質問のページ — PDF上で**縦書き**に組まれており、pdftotext では
 *     文字が列ごとにばらけて復元できない(-layout でも不可)。
 *     一般質問の全文は会議録検索システムにあるが、そちらは robots.txt で
 *     自動取得が禁止されているため、議会事務局への確認が必要。
 *
 * 出力は候補データ。事業との紐付けはキーワード一致による**提案**であり、
 * 人が確認するまで確定データにはしない。
 */

import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

function parseArgs(argv) {
  const args = {
    in: path.join(process.cwd(), "data", "raw", "council"),
    out: path.join(process.cwd(), "data", "candidates"),
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--in") args.in = path.resolve(argv[++i]);
    else if (argv[i] === "--out") args.out = path.resolve(argv[++i]);
    else {
      console.error(`不明な引数: ${argv[i]}`);
      process.exit(1);
    }
  }
  return args;
}

/** 事業マスターから、質疑本文と突き合わせる検索語を作る。 */
function loadProjectKeywords() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const { master } = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf-8"));
      const base = [master.canonicalName, ...(master.aliases ?? [])];
      // 「〜事業」を外した語幹でも当たるようにする(質疑では事業名が略されることが多い)
      const stems = base.map((n) => n.replace(/事業$/, "").replace(/（[^）]*）|\([^)]*\)/g, "").trim());
      return {
        projectId: master.projectId,
        name: master.canonicalName,
        terms: Array.from(new Set([...base, ...stems])).filter((t) => t.length >= 3),
      };
    });
}

function normalize(text) {
  return text.replace(/　/g, " ").replace(/[ \t]+/g, " ");
}

/** ヘッダ「第155回市議会定例会」「会期：令和８年 ６月 12 日〜」等から会議情報を拾う。 */
function meetingInfo(text) {
  const zen = "０１２３４５６７８９";
  const toHalf = (s) => (s ?? "").replace(/[０-９]/g, (c) => String(zen.indexOf(c)));
  const head = text.slice(0, 4000);
  return {
    session: toHalf(head.match(/第\s*([0-9０-９]+)\s*回市議会定例会/)?.[1] ?? null),
    term: (head.match(/会期[：:]\s*(令和[^\n]{0,40})/)?.[1] ?? null)?.replace(/\s+/g, " ").trim() ?? null,
    issue: toHalf(head.match(/第\s*([0-9０-９]+)\s*号/)?.[1] ?? null),
    publishedOn: head.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)?.slice(1).join("-") ?? null,
  };
}

/**
 * Q/A の抽出。Aは独立行のこともQ行の途中にあることもあるため、
 * Qの位置から次のQ(または節の切れ目)までを1ブロックとして扱い、その中でAを分割する。
 */
function extractQa(text) {
  const lines = text.split("\n");
  const qIndexes = [];
  lines.forEach((line, i) => {
    if (/^\s*Q\s*[　\s]/.test(line)) qIndexes.push(i);
  });

  const blocks = [];
  for (let k = 0; k < qIndexes.length; k++) {
    const start = qIndexes[k];
    const end = k + 1 < qIndexes.length ? qIndexes[k + 1] : Math.min(start + 12, lines.length);
    const chunk = lines.slice(start, end).join(" ").replace(/\s+/g, " ").trim();

    const split = chunk.split(/\sA\s*[　\s]?/);
    const question = split[0].replace(/^Q\s*/, "").trim();
    const answer = split.length > 1 ? split.slice(1).join(" ").trim() : null;

    // 直前の見出し行から、審査対象の事業名と金額を拾う(「地域公共交通再編事業 993万円」)
    let heading = null;
    for (let i = start - 1; i >= Math.max(0, start - 6); i--) {
      const m = lines[i].match(/^\s*(\S.*?(?:事業|費|経費|補助金|整備|支援).*?)\s*([\d,]+万?円)?\s*$/);
      if (m && m[1].length >= 4 && m[1].length <= 40) {
        heading = lines[i].replace(/\s+/g, " ").trim();
        break;
      }
    }

    blocks.push({ question, answer, heading });
  }
  return blocks;
}

function matchProjects(textParts, projects) {
  const haystack = textParts.filter(Boolean).join(" ");
  return projects
    .filter((p) => p.terms.some((t) => haystack.includes(t)))
    .map((p) => ({ projectId: p.projectId, name: p.name }));
}

function parseFile(filePath, projects) {
  const raw = normalize(fs.readFileSync(filePath, "utf-8"));
  const info = meetingInfo(raw);
  const blocks = extractQa(raw);

  return blocks.map((b, i) => {
    const review = [];
    if (!b.answer) review.push("答弁(A)を抽出できませんでした。原典で確認してください");
    if (!b.heading) review.push("審査対象の事業名を特定できませんでした");
    if (b.question.length < 10) review.push("質問文が短すぎます。抽出が途中で切れている可能性があります");

    const related = matchProjects([b.heading, b.question, b.answer], projects);
    if (related.length === 0) review.push("既存の事業に紐づきませんでした(対象外の質疑か、事業データが未登録)");

    return {
      _candidate: true,
      _review: review,
      id: `gikai${info.issue ?? "?"}-${i + 1}`,
      issue: info.issue,
      session: info.session,
      term: info.term,
      publishedOn: info.publishedOn,
      category: "予算・決算審査の質疑",
      heading: b.heading,
      question: b.question,
      answer: b.answer,
      relatedProjects: related,
      answerStatus: "未確認",
      sourceDocument: `気仙沼市議会だより 第${info.issue ?? "?"}号`,
    };
  });
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.in)) {
    console.error(`ディレクトリがありません: ${args.in}\n先に npm run fetch:council を実行してください。`);
    process.exit(1);
  }

  const projects = loadProjectKeywords();
  const files = fs.readdirSync(args.in).filter((f) => f.endsWith(".txt")).sort();
  if (files.length === 0) {
    console.error(`テキストがありません: ${args.in}`);
    process.exit(1);
  }

  const all = files.flatMap((f) => parseFile(path.join(args.in, f), projects));

  fs.mkdirSync(args.out, { recursive: true });
  const outFile = path.join(args.out, "council-qa.json");
  fs.writeFileSync(outFile, JSON.stringify(all, null, 2) + "\n", "utf-8");

  const linked = all.filter((c) => c.relatedProjects.length > 0);
  const needsReview = all.filter((c) => c._review.length > 0);

  console.log(`議会だより ${files.length}冊 / 事業マスター ${projects.length}件`);
  console.log(`質疑 ${all.length}件を抽出 → ${path.relative(process.cwd(), outFile)}`);
  console.log(`  既存事業に紐づいた質疑: ${linked.length}件`);
  console.log(`  要確認: ${needsReview.length}件`);

  for (const c of linked) {
    console.log(`\n  [${c.sourceDocument}] ${c.heading ?? "(事業名不明)"}`);
    console.log(`    Q: ${c.question.slice(0, 60)}…`);
    console.log(`    → ${c.relatedProjects.map((p) => p.name).join(", ")}`);
  }

  console.log(
    "\n注: 一般質問のページはPDF上で縦書きに組まれており、テキスト抽出では復元できません。" +
      "\n    ここで取れるのは予算・決算審査の質疑のみです。"
  );
}

main();
