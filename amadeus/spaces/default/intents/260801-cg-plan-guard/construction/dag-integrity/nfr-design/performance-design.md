# Performance Design — dag-integrity(U1)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 性能設計は `business-logic-model.md` の判定フロー(computeBoltDag 3アーム化と compile 分岐)が既読データのみで完結する構造(NFR-3)に接地する。

## 性能設計

- 追加 I/O ゼロ: BoltDagOutcome の判定は既に読み込む unit-of-work-dependency.md と state(compile が :339 で読取済み)のみを使う — 新規 read なし(`business-logic-model.md` のスコープ判定源選定どおり)。
- compile の実行頻度は PostToolUse hook 駆動で不変。3アーム化は分岐追加のみで計算量は O(1) 増。

## 検証形

- 実時間ベンチ持ち込み禁止(requirements NFR-3)。性能面の検証は「新規 I/O ゼロ」の構造レビュー(実装 diff の read 系呼び出し棚卸し)で行い、負荷試験は生成しない(bt-proportional-selection)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:37:27Z
- **Iteration:** 1
- **Scope decision:** none

Major 1: logical-components の C-ID off-by-one(C4/C5 → 正 C5/C6)。Minor 1: 数値の測定 ref なし(最大12を実測)。→ conductor が canonical 照合のうえ両方是正済み。他(c1 posture / N-A 根拠 / no-new-I/O / fail-closed 方向 / 層別保証)は確認。

### Findings

- Major: C4/C5 → C5/C6 へ是正(AD components.md :28-29 照合)。
- Minor: 最大十数 → 最大12(測定 ref 付き)へ是正。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:39:43Z
- **Iteration:** 2
- **Scope decision:** none

Major(C-ID)と Minor(数値 ref)の閉包を canonical 照合+再実測で確認。他3ファイル無退行。指摘 0 件。

### Findings

- None
