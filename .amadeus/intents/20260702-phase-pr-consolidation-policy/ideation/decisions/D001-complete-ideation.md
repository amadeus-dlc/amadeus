# D001: complete ideation

## 背景

Issue #310 は、小さい Intent の phase PR 往復と merge 待ちが内容の作成よりも大きいコストになっている問題を扱う。
Discovery `20260702-phase-cycle-deterministic-contract` の候補判断で #311 の後に扱う依存順が確定しており、前提の Intent `20260702-state-json-scaffolding` は cycle 完了済みである。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、統合条件の最終形、統合単位の境界、branch 命名との整合、policy の記載先を具体化する。

## 理由

Issue #310 の対象、対象外、受け入れ条件と、直近 cycle の観察（2 Intent の完走に phase PR 13 本と人間 merge 13 回）から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 4 件は、Inception の要求化と既存 policy 文書の分析で扱える。

## 影響

Inception では、policy の記載先（Git Branching Policy への追記か、新しい policy 文書か）を最初に確定する。
