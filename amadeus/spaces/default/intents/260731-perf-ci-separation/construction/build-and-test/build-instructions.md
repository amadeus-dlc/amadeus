# Build Instructions — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。本 intent はビルド成果物を持たない(TypeScript を bun 直実行)。ビルド相当の検証は typecheck と dist/self-install 同期で行う。

## 手順(実測済み・全 exit 0)

- `bun run typecheck`(tsc --noEmit ×2 project)
- `bun run dist:check` / `bun run promote:self:check`(U1〜U4 は core 無接触 — 同期不変の実証)

## 実測(2026-08-01、merge 済み main 150634197 を含む本 record ブランチ)

typecheck=0 / lint=0 / dist:check=0 / promote:self:check=0(code-summary.md 各 unit の PR 時実測とも一致)
