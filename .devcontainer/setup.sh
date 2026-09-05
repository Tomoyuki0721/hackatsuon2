#!/usr/bin/env bash
# 気仙沼市 政策・予算ダッシュボード - 環境セットアップスクリプト
# Codespace の初回起動時に自動実行されます(数分かかります)

set -x

# 1. Claude Code(AIコーディングエージェント)のインストール
curl -fsSL https://claude.ai/install.sh | bash

# PATH を通す(bash / zsh 両対応)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.profile"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

# 2. アプリの依存パッケージをインストール(Next.js / React / Tailwind / Recharts)
npm install

# 新しいターミナルを開くたびに案内を表示する
cat << 'BANNER' >> "$HOME/.bashrc"
echo ""
echo "🐟 気仙沼市 政策・予算ダッシュボード"
echo "   開発サーバー: npm run dev   (ポート3000が自動で転送されます)"
echo "   本番ビルド:   npm run build (out/ に静的書き出し)"
echo ""
BANNER
