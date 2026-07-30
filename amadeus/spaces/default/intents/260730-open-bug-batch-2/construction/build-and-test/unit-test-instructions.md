# Unit Test Instructions — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 対象

- #1734: `bun test tests/unit/t370-promote-self-scopegrid-order.test.ts`(正準順・対称化・own-property/prototype 回帰)
- #1769/#1750 の契約改訂波及: t186 / t116(degrade 解決・path 射影)

## 実測

各 Bolt worktree で 0 fail(t370 系 16 pass、t186+t116 は #1750 worktree で契約改訂後 green)。#1734 は full CI スイート PASS(669 files / 9337 assertions)も実測。
