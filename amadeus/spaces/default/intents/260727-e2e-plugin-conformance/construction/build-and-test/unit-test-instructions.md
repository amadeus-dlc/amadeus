# Unit Test Instructions

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md — FR 別リグレッションの unit 面を code-summary の対応表から導出。

## 対象(本 intent の unit 層変更)

code-generation-plan.md の Step 1〜3・Step E と code-summary.md の FR 対応表から導出:

- `bun test tests/unit/t132-hooks-doc-count-sync.test.ts` — FR-6(#1590): count-free 契約(件数断定ゼロ+per-script インベントリ forward/reverse)。落ちる実証: doc へ count word 注入で赤
- `bun test tests/unit/t209-promote-self-dangling-symlink.test.ts` — FR-1(#1575): canonical import 消費+等価 assert
- `bun test tests/unit/t301-plugin-cli-seams.test.ts` — FR-7(#1591): `defaultPluginHostRoot` / `pluginHostRootFromHook` の導出(harness leaf / cwd フォールバックの両方向)

## 実行方法

実行は `bash tests/run-tests.sh --ci`(既定 -P=min(cores,4) 並列)に包含される。
