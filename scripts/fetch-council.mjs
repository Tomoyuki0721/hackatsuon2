#!/usr/bin/env node
/**
 * 気仙沼市公式サイトから「議会だより」PDFを取得する。
 *
 *   node scripts/fetch-council.mjs [--out data/raw/council] [--force]
 *
 * 取得元と作法について:
 *   - 対象は https://www.kesennuma.miyagi.jp/ 。robots.txt は "Allow: /" で、
 *     サイトマップも公開されている。そのサイトマップを入口として使う。
 *   - 会議録検索システム(www.city.kesennuma.miyagi.dbsr.jp)は robots.txt が
 *     トップページ以外を Disallow にしているため、**このスクリプトは触らない**。
 *     一般質問の全文が必要な場合は、議会事務局への利用許諾の確認が先。
 *   - lastmod を記録し、更新されていない号は再ダウンロードしない。
 *   - リクエスト間隔を空け、素性のわかる User-Agent を送る。
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// 議会だよりの一覧ページ。サイトマップには最近の号のPDFしか載っておらず、
// バックナンバー(第43号〜)はこの一覧からしか辿れない。
// 各号のディレクトリ名は不規則(0080, 63, 027, GIKAIDAYORI48 など)なので、
// URLを組み立てず必ずリンクを辿ること。
const INDEX_URL = "https://www.kesennuma.miyagi.jp/li/shisei/160/020/index.html";
const SITE_ROOT = "https://www.kesennuma.miyagi.jp/";
const UA = "kesennuma-policy-dashboard/0.1 (civic data project; contact via GitHub Tomoyuki0721/hackatsuon2)";
const DELAY_MS = 2000;

function parseArgs(argv) {
  const args = {
    out: path.join(process.cwd(), "data", "raw", "council"),
    force: false,
    // 既定は令和4年度以降(第66号〜)。事業データの対象年度に合わせている。
    from: 66,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") args.out = path.resolve(argv[++i]);
    else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--from") args.from = Number(argv[++i]);
    else {
      console.error(`不明な引数: ${argv[i]}`);
      process.exit(1);
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

/** 一覧ページから、各号のページURLを拾う。 */
function findIssuePages(html, from) {
  const entries = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, "");
    const issue = text.match(/議会だより\s*第\s*(\d+)\s*号/)?.[1];
    if (!issue || Number(issue) < from) continue;
    entries.push({
      issue: Number(issue),
      pageUrl: new URL(m[1].replace(/^(\.\.\/)+/, ""), SITE_ROOT).href,
    });
  }
  return entries.sort((a, b) => a.issue - b.issue);
}

/**
 * 各号のページから、取り込むPDFのURLを決める。
 * 一般質問だけを収めたPDFがあればそれを、無ければ全ページ版を使う
 * (全ページ版は数MBあるため、必要な部分だけで済むならその方が軽い)。
 */
function findPdfUrl(html, pageUrl) {
  const links = [];
  const re = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, "") });
  }

  const general = links.find((l) => l.text.includes("一般質問"));
  const all = links.find((l) => /_all\.pdf$/.test(l.href));
  const chosen = general ?? all;
  if (!chosen) return null;

  return {
    url: new URL(chosen.href, pageUrl).href,
    kind: general ? "一般質問" : "全ページ",
  };
}

function ensurePdftotext() {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "pipe" });
  } catch {
    console.error("pdftotext が必要です: sudo apt-get install -y poppler-utils");
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  ensurePdftotext();
  fs.mkdirSync(args.out, { recursive: true });

  const manifestPath = path.join(args.out, "manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    : {};

  console.log(`一覧ページを取得: ${INDEX_URL}`);
  const indexHtml = await getText(INDEX_URL);
  const issues = findIssuePages(indexHtml, args.from);
  console.log(
    `議会だより ${issues.length}号を検出 (第${issues[0]?.issue}号〜第${issues.at(-1)?.issue}号)\n`
  );

  let fetched = 0;
  let skipped = 0;

  for (const n of issues) {
    const known = manifest[n.issue];
    // 発行済みの号は差し替わらないため、一度取得したら再取得しない
    if (!args.force && known) {
      skipped++;
      continue;
    }

    await sleep(DELAY_MS);
    const issueHtml = await getText(n.pageUrl);
    const pdf = findPdfUrl(issueHtml, n.pageUrl);
    if (!pdf) {
      console.warn(`第${n.issue}号: PDFのリンクが見つかりませんでした (${n.pageUrl})`);
      continue;
    }

    const pdfPath = path.join(args.out, `gikai_${n.issue}.pdf`);
    const txtPath = path.join(args.out, `gikai_${n.issue}.txt`);
    const rawPath = path.join(args.out, `gikai_${n.issue}.raw.txt`);

    await sleep(DELAY_MS);
    const size = await download(pdf.url, pdfPath);

    // 2通りで抽出する。議会だよりは横書きと縦書きが混在するため:
    //   既定       … 予算審査の質疑(横書き)がそのまま読める
    //   -raw       … コンテンツストリーム順。縦書きの一般質問が正しい順序で
    //                1文字ずつ出てくるので、連結すれば復元できる
    execFileSync("pdftotext", ["-enc", "UTF-8", pdfPath, txtPath], { stdio: "pipe" });
    execFileSync("pdftotext", ["-enc", "UTF-8", "-raw", pdfPath, rawPath], { stdio: "pipe" });

    manifest[n.issue] = {
      pageUrl: n.pageUrl,
      pdfUrl: pdf.url,
      kind: pdf.kind,
      fetchedAt: new Date().toISOString(),
    };
    console.log(
      `第${n.issue}号 取得 [${pdf.kind}] (${size.toLocaleString()} bytes) → ${path.basename(txtPath)}`
    );
    fetched++;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  console.log(`\n新規・更新: ${fetched}号 / 変更なし: ${skipped}号`);
  if (fetched > 0) console.log("次は: npm run parse:council");
}

main().catch((e) => {
  console.error(`取得に失敗しました: ${e.message}`);
  process.exit(1);
});
