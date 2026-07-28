# Tech Stack Decisions — U2 u2-install-verb

上流入力(consumes 全数): technology-stack.md(Bun/ESM 現行)、business-logic-model.md(swap)、business-rules.md(BR-U2-6)、requirements.md(FR-1f)。追加参照: 同 Unit FD の domain-entities.md(deps 2 seam の引数・型の正本)

## TS-U2-1: 追加依存なし

コピー・rename・lstat は Bun/Node 標準 FS API のみ(technology-stack.md 現行スタック)。archiver・rsync 等の外部依存を追加しない(Bun-only 前提維持)。

## TS-U2-2: seam と被覆

deps 2 seam(stagingEntryState / copyPluginSource — business-logic-model.md Step 2-3)は amadeus-plugin.ts の既存 PluginCliDeps へ追加し、テストは handlePluginCli in-process 経由+実 FS tmp dir(business-rules.md BR-U2-6、requirements.md FR-1f — bun-coverage-spawn-blindspot 回避)。
