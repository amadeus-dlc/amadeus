# Performance Design — issuance-guard(U2)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 性能設計は `business-logic-model.md` の純判定器(planIntegrityVerdict — 入力が全て値)+単一 seam 構成に接地する。

## 性能設計

- 判定は next の既読データ(bolt_dag / bolt_dag_absence / autonomy / node 属性)のみで O(1) — 新規 I/O ゼロ(NFR-3)。
- guardMessage の組み立ては発動時のみ(正常経路のコストは分岐1回)。

## 検証形

- 実時間ベンチ持ち込み禁止。検証は実装 diff の read 系呼び出し棚卸し(新規 read 0 の構造確認)で行う(bt-proportional-selection)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:45:10Z
- **Iteration:** 1
- **Scope decision:** none

C-ID canonical 一致(C1/C2/C3)・c1 posture・N/A 根拠・fail-closed 方向・数値 ref・層別保証を確認。Minor 2 は informational(様式注記)。指摘の是正不要。

### Findings

- None
