# Unit Test Instructions — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。

## 対象と実行

- `bun test tests/unit/latency-median-budget-gate.test.ts`(19 tests)— 述語純関数の値レベル網羅(code-summary.md FR-2): 旧 p95 判定(verbatim 再現)との対照「6〜49 spikes: 旧赤・新緑」、全シフト退行で新赤、エッジ(空列・非有限・境界)

## 判定

19 pass 0 fail(57 tests 一括実行の内訳 — code-summary.md 検証表)。
