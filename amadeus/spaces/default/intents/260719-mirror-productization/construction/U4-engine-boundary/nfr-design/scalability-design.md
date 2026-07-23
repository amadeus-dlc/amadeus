# Scalability Design — U4-engine-boundary

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SCD-U4-1: canonical境界集合(SC-U4-1)

対象phase境界は既存`PHASE_CHECK_REQUIRED_PHASES`だけを参照し、U4固有の境界配列を作らない。境界追加・削除はcanonical定数の変更へ自動追従する。

## SCD-U4-2: 2値決定の維持(SC-U4-2)

`MirrorBoundaryDecision`は`ask | auto-sync`の2値だけを持つ。入力は解決済み`autoMirror`とMirror Issueフィールド有無に正規化し、設定キーやmirror verbの追加を分岐軸へ自動展開しない。

## 規模の扱い

workflowあたりの発火回数はcanonical phase境界数に比例し、現在は最大3回で固定される。キュー、並列処理、分散ロック、AWS資源は不要である。
