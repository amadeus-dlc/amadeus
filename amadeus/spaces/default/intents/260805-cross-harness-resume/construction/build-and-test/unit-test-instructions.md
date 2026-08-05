# Unit Test Instructions — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

本 intent の変更が触れる unit 層の既存契約(新規テストは実 FS を触るため全て integration 層 — `cid:code-generation:fs-tests-integration-first`。unit 層への新規追加はなし):

| ファイル(フルパス) | 固定する契約 |
|---|---|
| `tests/unit/t10-hook-session-start.test.ts` | `.current-session` 書込み契約(#1922 修正後の正本)— FR-3 の前提となる SessionStart 挙動 |
| `tests/unit/t28-audit-event-sync.test.ts` | audit イベント台帳の同期 — `RECOVERY_COMPLETED.optionalAttributes` 拡張の整合 |
| `tests/unit/gen-coverage-registry.test.ts` | coverage registry の鮮度(t448-t450 追加後の再生成を検査) |

## 実行

```
bun test tests/unit/t10-hook-session-start.test.ts tests/unit/t28-audit-event-sync.test.ts tests/unit/gen-coverage-registry.test.ts --timeout=30000
```

実行前に全パスの実在を `ls` で確認し、実行後に `Ran ... across N files` を指定数(3)と照合する(`cid:build-and-test:test-path-set-completeness` — 本 intent の CG 段で bun の不存在パス無音除外を2回実測済み。「t10」は unit と e2e に別ファイルが共存するためフルパス必須)。

## 合否

全 pass / `across 3 files`。
