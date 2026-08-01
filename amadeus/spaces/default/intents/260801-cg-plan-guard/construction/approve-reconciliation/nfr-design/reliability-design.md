# Reliability Design — approve-reconciliation(U3)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 信頼性は `business-logic-model.md` の fail-closed 述語(非数値 Batch number 除外・部分実績の全数列挙拒否)に接地する。

## 信頼性設計

- v1/v2 audit schema 両対応(fields.* / attributes.* — 片側走査の偽 0 件を防ぐ)。
- 部分実績は不足 batch を全数列挙して拒否(最初の1件で打ち切らない — 是正の1往復化)。
- DEGRADED は並行実績側(driver 降格 ≠ 形態降格)— 誤拒否を作らない(AC-2b)。

## 検証形

- FR-2 の AC(2a/2b/2c)と FR-6 corpus sweep が引き受ける。
