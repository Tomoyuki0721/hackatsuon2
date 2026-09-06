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

const SITEMAP = "https://www.kesennuma.miyagi.jp/sitemap.xml";
const UA = "kesennuma-policy-dashboard/0.1 (civic data project; contact via GitHub Tomoyuki0721/hackatsuon2)";
const DELAY_MS = 2000;

function parseArgs(argv) {
  const args = { out: path.join(process.cwd(), "data", "raw", "council"), force: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") args.out = path.resolve(argv[++i]);
    else if (argv[i] === "--force") args.force = true;
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

/** サイトマップから議会だより(全ページ版)のURLと最終更新日を拾う。 */
function findNewsletters(xml) {
  const entries = [];
  const re = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1];
    const issue = url.match(/kesennuma_gikai_(\d+)_WEB_all\.pdf$/)?.[1];
    if (issue) entries.push({ issue: Number(issue), url, lastmod: m[2] ?? null });
  }
  return entries.sort((a, b) => a.issue - b.issue);
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

  console.log(`サイトマップを取得: ${SITEMAP}`);
  const xml = await getText(SITEMAP);
  const newsletters = findNewsletters(xml);
  console.log(`議会だより ${newsletters.length}号を検出 (第${newsletters[0]?.issue}号〜第${newsletters.at(-1)?.issue}号)\n`);

  let fetched = 0;
  let skipped = 0;

  for (const n of newsletters) {
    const known = manifest[n.issue];
    if (!args.force && known && known.lastmod === n.lastmod) {
      skipped++;
      continue;
    }

    const pdfPath = path.join(args.out, `gikai_${n.issue}.pdf`);
    const txtPath = path.join(args.out, `gikai_${n.issue}.txt`);

    const size = await download(n.url, pdfPath);
    execFileSync("pdftotext", ["-enc", "UTF-8", pdfPath, txtPath], { stdio: "pipe" });

    manifest[n.issue] = { url: n.url, lastmod: n.lastmod, fetchedAt: new Date().toISOString() };
    console.log(`第${n.issue}号 取得 (${size.toLocaleString()} bytes) → ${path.basename(txtPath)}`);
    fetched++;

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  console.log(`\n新規・更新: ${fetched}号 / 変更なし: ${skipped}号`);
  if (fetched > 0) console.log("次は: npm run parse:council");
}

main().catch((e) => {
  console.error(`取得に失敗しました: ${e.message}`);
  process.exit(1);
});
