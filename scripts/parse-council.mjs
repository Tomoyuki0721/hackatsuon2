#!/usr/bin/env node
/**
 * 議会だよりのテキストから、予算審査の質疑応答(Q/A)を候補として取り出す。
 *
 *   node scripts/parse-council.mjs [--in data/raw/council] [--out data/candidates]
 *
 * 議会だよりは横書きと縦書きが混在するため、2種類の抽出結果を使い分ける:
 *   gikai_N.txt      既定の抽出。予算審査の「主な質疑」(横書きQ/A)を読む
 *   gikai_N.raw.txt  pdftotext -raw。縦書きの一般質問は、既定や -layout では
 *                    文字が列ごとにばらけて壊れるが、コンテンツストリーム順
 *                    (-raw)なら1文字ずつ正しい順序で出てくる。
 *                    1文字だけの行を連結すれば元の文章に戻る。
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

/**
 * -raw 出力の復元。縦書きは1行1文字で出てくるので、短い行を連結して文章に戻す。
 * 空行は段落の区切りとして扱い、そこで一度確定させる。
 */
function joinVerticalLines(rawText) {
  const out = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = "";
  };

  for (const line of rawText.split("\n")) {
    const t = line.trim();
    if (t === "") {
      flush();
      continue;
    }
    if ([...t].length <= 2) buffer += t;
    else {
      flush();
      out.push(t);
    }
  }
  flush();
  return out;
}

/**
 * 一般質問の抽出。復元後の本文は「問…答…問…答…」と続き、
 * 見出しや質問者名が近くの短い行に現れる。
 */
function extractGeneralQuestions(rawText) {
  const lines = joinVerticalLines(rawText);
  const results = [];

  lines.forEach((line, index) => {
    if (!line.includes("問") || !line.includes("答")) return;
    if ([...line].length < 60) return; // 見出しや注記を拾わない

    const pairs = [...line.matchAll(/問([\s\S]+?)答([\s\S]+?)(?=問|$)/g)];
    if (pairs.length === 0) return;

    // 前後の短い行から、見出し(記号なしの短文)と質問者名(全角スペース区切りの氏名)を拾う
    const neighbours = lines.slice(Math.max(0, index - 3), index + 5);
    const speaker = neighbours.find((l) => /^[^\s]{1,5}[　\s]+[^\s]{1,6}$/.test(l.trim())) ?? null;
    const heading =
      neighbours.find(
        (l) => l !== speaker && [...l].length >= 5 && [...l].length <= 30 && !/[問答。]/.test(l) && !/^\d/.test(l)
      ) ?? null;

    pairs.forEach(([, q, a], i) => {
      results.push({
        heading,
        speaker: speaker?.replace(/\s+/g, " ").trim() ?? null,
        question: q.trim(),
        answer: a.trim(),
        sequence: i + 1,
        totalInBlock: pairs.length,
      });
    });
  });

  return results;
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

  // 同じ号の -raw 抽出があれば、縦書きの一般質問も拾う
  const rawPath = filePath.replace(/\.txt$/, ".raw.txt");
  const general = fs.existsSync(rawPath)
    ? extractGeneralQuestions(normalize(fs.readFileSync(rawPath, "utf-8")))
    : [];

  const generalCandidates = general.map((g, i) => {
    const review = [];
    if (!g.speaker) review.push("質問者名を特定できませんでした");
    if (!g.heading) review.push("見出しを特定できませんでした");
    if (g.totalInBlock > 1) {
      review.push(
        `同じ紙面に${g.totalInBlock}件の質疑が連続しており、質問と答弁の区切りがずれている可能性があります`
      );
    }

    const related = matchProjects([g.heading, g.question, g.answer], projects);
    if (related.length === 0) review.push("既存の事業に紐づきませんでした");

    return {
      _candidate: true,
      _review: review,
      id: `gikai${info.issue ?? "?"}-ippan-${i + 1}`,
      issue: info.issue,
      session: info.session,
      term: info.term,
      publishedOn: info.publishedOn,
      category: "一般質問",
      heading: g.heading,
      speaker: g.speaker,
      question: g.question,
      answer: g.answer,
      relatedProjects: related,
      answerStatus: "未確認",
      sourceDocument: `気仙沼市議会だより 第${info.issue ?? "?"}号`,
    };
  });

  const reviewCandidates = blocks.map((b, i) => {
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

  return [...generalCandidates, ...reviewCandidates];
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.in)) {
    console.error(`ディレクトリがありません: ${args.in}\n先に npm run fetch:council を実行してください。`);
    process.exit(1);
  }

  const projects = loadProjectKeywords();
  const files = fs
    .readdirSync(args.in)
    .filter((f) => f.endsWith(".txt") && !f.endsWith(".raw.txt"))
    .sort();
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
  const byCategory = (name) => all.filter((c) => c.category === name).length;

  console.log(`議会だより ${files.length}冊 / 事業マスター ${projects.length}件`);
  console.log(`質疑 ${all.length}件を抽出 → ${path.relative(process.cwd(), outFile)}`);
  console.log(`  内訳: 一般質問 ${byCategory("一般質問")}件 / 予算・決算審査 ${byCategory("予算・決算審査の質疑")}件`);
  console.log(`  既存事業に紐づいた質疑: ${linked.length}件`);
  console.log(`  要確認: ${needsReview.length}件`);

  for (const c of linked) {
    console.log(`\n  [${c.category}] ${c.heading ?? "(見出し不明)"}${c.speaker ? ` / ${c.speaker}` : ""}`);
    console.log(`    問: ${c.question.slice(0, 70)}…`);
    console.log(`    → ${c.relatedProjects.map((p) => p.name).join(", ")}`);
  }

  console.log(
    "\n一般質問は縦書きのため pdftotext -raw の出力から復元しています。" +
      "\n連結の都合で質問と答弁の区切りがずれることがあるため、_review を確認のうえ原典と照合してください。"
  );
}

main();
