# Performance Design — approve-reconciliation(U3)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 性能設計は `business-logic-model.md` の audit 読み(既存 readAllAuditShards 再利用)に接地する。

## 性能設計

- 新規の走査・parse ロジックなし(NFR-3 の実装可能形へ精密化 — §12a iteration 1 Major の是正): approve 経路(handleReport)は現行 audit を読まないため、本 unit が **approve 経路初の audit 読み**を導入する。ただし読み手は既存の実証済みユーティリティ `readAllAuditShards` の再利用で、対象は宣言 batch ≤12 × イベント種3の有界走査。「新規 read 0」ではなく「新規呼び出し1箇所・新規 parse 実装 0」が検証可能な主張。
- 突合は宣言 batch 数(最大 12 実測 corpus — U1 の測定を参照)× イベント種3の集合照合で O(n) 微小。

## 検証形

- 実時間ベンチなし。実装 diff の read 系棚卸しで「新規呼び出しは collectSwarmEvidence → readAllAuditShards の1箇所のみ・新規 parse 実装 0」を確認(bt-proportional-selection)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:52:18Z
- **Iteration:** 1
- **Scope decision:** none

Critical 1(C7 誤ラベル — canonical は corpus sweep ハーネス)、Major 1(『approve 経路は既に audit を読む』は偽 — 初の audit 読み導入を有界・parse 新設ゼロへ精密化)、Minor 1(consumes 5点の N/A 根拠不在)。→ conductor が3点とも是正、N/A 注記は U1/U2 へも同根展開。

### Findings

- Critical: C7 誤ラベル → approve 拒否メッセージは C1/C3 面へ訂正、C7 = corpus sweep(テスト専用)を別掲。
- Major: I/O 主張を『新規呼び出し1箇所・新規 parse 0・有界 ≤12』へ精密化。
- Minor: SKIP 由来 consumes 5点の N/A 根拠を15ファイル全数へ追記。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:54:37Z
- **Iteration:** 2
- **Scope decision:** none

Critical/Major/Minor の3閉包を canonical 照合+同根展開スポットチェックで確認。指摘 0 件。

### Findings

- None
