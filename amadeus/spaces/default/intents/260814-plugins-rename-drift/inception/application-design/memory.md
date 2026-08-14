<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-14T08:21:06Z — 設計裁定 7 件を read-only spike の実測(合成形状の処理可能判定・ADR-6 の import 遮断・registry 駆動検証)に接地して semi 梯子で裁定した; 推奨は全て spike 事実から導出。

- 2026-08-14T08:28:23Z — レビュー iteration 1 の BLOCKER 2 件(ADR-6 実体不在・規模数値欠落)を observe-quality(repair)経由で是正し iteration 2 READY; ADR-6 は既存機構制約の採録として新設、規模表は intent-backlog の PU 数値と整合させた。残 FOLLOW-UP(PU 参照はレビュースコープ外)は delivery-planning 段で intent-backlog を consume する際に照合される。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-14T08:21:06Z — 宣言側 fail-closed の範囲を「settings 近傍キーの実在検査」に限定し全未知キー検査を見送った; advisories 二重パーサ構造(QP-1、#2997 スコープの解釈)の全面是正はスコープ膨張と判断。ADR-3 に根拠と代替を記録。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
