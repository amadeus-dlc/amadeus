# D001: complete ideation

## 背景

Issue #351 は、worktree 並行、フェーズパイプライン、ゲート承認のバッチ化の運用判断が記録されず、都度判断になっている問題を扱う。
Discovery `20260702-parallel-execution` の候補「並行運用ポリシー」であり、待機条件「共有インデックスの生成物化の後に扱う」は Issue #334 の cycle 完了で解消している。
Ideation 前の判断点だった Intent Record の単位は、[G001](../grillings/G001-new-intent-vs-existing-intent-update.md) の GD001 で新規 Intent として確定した。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、policy の配置先、判断基準の粒度、Issue #334 の cycle で観察した実例の記録先、validator または evaluator で検出する候補の区分を具体化する。

## 理由

Issue #351 の目的、対象、対象外、受け入れ条件と、Discovery の候補判断、G001 の GD001 から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 4 件は、Inception の要求化と既存 steering policy（`git-branching.md`、`policies.md`）の分析で扱える。

## 影響

Inception では、policy の配置先（既存 `git-branching.md` への追記か、新規 policy ファイルか）を最初に確定する。
この配置先が、既存 Git Branching Policy との責務分担と参照契約を決める。
