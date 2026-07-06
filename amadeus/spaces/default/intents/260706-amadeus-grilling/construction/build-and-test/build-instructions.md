# Build Instructions — Amadeus Grilling 統合

**Upstream**: `../grilling/code-generation/code-generation-plan.md` / `code-summary.md` の変更セットを対象とする。

## ビルド手順

このリポジトリのビルド = dist 生成+セルフインストール昇格:

1. `bun scripts/package.ts` — core/ + harness/ から全4ハーネスの dist を再生成
2. `bun scripts/package.ts --check` — バイト単位ドリフトガード(コミット前必須)
3. `bun run promote:self` — dist/claude・dist/codex から .claude/ .codex/ .agents/ へ昇格
4. `bun run promote:self:check` — 昇格パリティ検査

## 前提条件

- bun がインストール済み(PATH 上)
- 依存: `bun install`(devDependencies のみ — 配布物は依存ゼロ)
