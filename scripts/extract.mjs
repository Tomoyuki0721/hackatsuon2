#!/usr/bin/env node
/**
 * 原典PDF → テキスト抽出(パイプラインの RAW 段階)。
 *
 * poppler-utils の pdftotext を使う。日本語が化けるため -enc UTF-8 は必須。
 * -layout は表の桁が保たれる一方で欄がずれることがあるため、既定では付けない
 * (財源内訳の列対応が崩れた実例があるため、必要な時だけ --layout を付けて併用する)。
 *
 *   node scripts/extract.mjs [--src <PDFのあるディレクトリ>] [--out data/raw] [--layout]
 *
 * PDFはリポジトリに含めていない(.gitignore で除外)。手元にPDFを置いて実行すること。
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const args = { src: process.cwd(), out: path.join(process.cwd(), "data", "raw"), layout: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--src") args.src = path.resolve(argv[++i]);
    else if (argv[i] === "--out") args.out = path.resolve(argv[++i]);
    else if (argv[i] === "--layout") args.layout = true;
    else {
      console.error(`不明な引数: ${argv[i]}`);
      process.exit(1);
    }
  }
  return args;
}

function ensurePdftotext() {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "pipe" });
  } catch {
    console.error(
      "pdftotext が見つかりません。poppler-utils を入れてください。\n" +
        "  Debian/Ubuntu(Codespace含む): sudo apt-get update && sudo apt-get install -y poppler-utils\n" +
        "  macOS: brew install poppler"
    );
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv);
  ensurePdftotext();

  if (!fs.existsSync(args.src)) {
    console.error(`ディレクトリがありません: ${args.src}`);
    process.exit(1);
  }

  const pdfs = fs.readdirSync(args.src).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  if (pdfs.length === 0) {
    console.error(`PDFが見つかりません: ${args.src}`);
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });

  for (const pdf of pdfs) {
    const input = path.join(args.src, pdf);
    const suffix = args.layout ? ".layout.txt" : ".txt";
    const output = path.join(args.out, pdf.replace(/\.pdf$/i, suffix));

    const options = ["-enc", "UTF-8"];
    if (args.layout) options.push("-layout");

    execFileSync("pdftotext", [...options, input, output], { stdio: "pipe" });
    const size = fs.statSync(output).size;
    console.log(`${pdf} → ${path.relative(process.cwd(), output)} (${size.toLocaleString()} bytes)`);

    if (size < 1000) {
      console.warn(`  警告: 出力が極端に小さいです。テキスト層の無いスキャンPDFかもしれません。`);
    }
  }

  console.log(`\n${pdfs.length}件を抽出しました。次は: npm run parse`);
}

main();
