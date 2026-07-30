# Build Instructions — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## ビルド手順

本リポジトリはビルド成果物を持たず、「ビルド」= 配布面の再生成と drift 検査である。

1. `bun install --frozen-lockfile`
2. `bun scripts/package.ts` — 正本(packages/framework/core・harness)から dist 7ハーネスを再生成
3. `bun run promote:self` — 自己インストール面を同期
4. 検査: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 を要求)

## 本 intent での実測

両 Bolt とも worktree 内で上記を実行し exit 0(unit summary 参照)。PR CI の「Dist and self-install drift」ジョブでも再検証済み。
