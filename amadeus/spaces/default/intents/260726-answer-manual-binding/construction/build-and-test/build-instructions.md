# Build Instructions — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元)。

## ビルド手順

正本2ファイル(lifecycle/coordinator — code-summary.md 変更一覧)の変更に伴う配布物再生成: `bun scripts/package.ts` → `bun run promote:self`(24 ファイル同期)。ドリフトガード `bun run dist:check` / `bun run promote:self:check` とも exit 0 実測。

## 前提

- bun 1.3.x。依存追加なし
