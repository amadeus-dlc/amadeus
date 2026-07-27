# Build Instructions — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。

## ビルド手順

本変更は tests/ のみ(code-summary.md の規模表のとおり 4 ファイル)でビルド生成物なし。配布面の無風確認のみ:
- `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 実測 — code-summary.md 検証表)

## 前提

- bun 1.3.x。依存追加なし
