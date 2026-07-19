# Performance Requirements — election-record(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U3 は render(記録生成)と verify(照合)の純関数的変換層で、入力は選挙1件分の票集合(現登録 14 名 — stage diary Interpretations 2026-07-19 の `team.sh amadeus` 実測記録を参照)に閉じる。専用の性能 SLO を新設しない(observability-setup:c3 — 実在しない service SLO を作らない)。

- render/verifyReservations/verifySelf は票列の単一走査 O(n)(business-logic-model.md の検査述語)。二次以上の計算量を導入しない
- 数値目標は置かない(未実測の数値を SLO 化しない — numbers-from-command-output-only)。停止ガードは既存テストランナーのタイムアウトのみ

## 測定と検証

- 決定性(business-rules.md BR-R5 — 同一入力2回実行 deep-equal)が性能テストに優先する検証対象。ベンチマークは追加しない(規模正当化 — 既存で代替できない根拠なし)
- ランタイムは既存スタック(technology-stack.md の Bun/TS 実測)を踏襲し追加最適化を要求しない
