# Build Instructions — 260719-ballot-failclosed-amend

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

本 intent はビルド成果物を持たない(scripts/ 直実行の Bun/TS、配布面変更なし — code-summary.md の dist 投影 0 実測)。検証ビルドは型検査で代替する:

```
bun run typecheck   # tsc --noEmit(tsconfig + tests)
```

## 実測記録

builder(bolt worktree、head e5756ddc2 系列)exit 0。dist:check / promote:self:check は非該当(dist 非投影 — RE 実測 git ls-files 0件)。
