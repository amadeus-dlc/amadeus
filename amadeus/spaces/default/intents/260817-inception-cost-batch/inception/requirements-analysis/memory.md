<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-17T23:06:00Z — 質問は material 2問のみ(効果測定の N・目標値/縮小率下限の要否)とし、実装形の選定は Issue 本文が AD 裁定事項と明示するため問わない(c5)。full autonomy につき両問は decide-question 梯子で AUTO_DECIDED(Q1=A: N=5・中央値35分未満、Q2=A: 下限なし+帰属検査)
- 2026-08-17T23:06:00Z — FR 数 16 は Standard バンド(15-30)の下端側; 2 Issue バッチで要件面が Issue 本文+クロスレビューにより高密度に確定済みのため、バンド充足のための水増しはしない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-17T23:06:00Z — Step 7 の「blank で作成→モード選択」フローは full autonomy 下の梯子ルーティング(c1-semi-ladder-routing)に置換; blank 質問ファイル作成→梯子裁定→AUTO_DECIDED provenance 付き書き戻しの順で実施

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-17T23:06:00Z — #2415 の縮小率に数値下限を課さない選択(Q2=A): 判別力(threshold-inside-observed-range)と Issue 原文準拠を、見かけの厳格さより優先。実効の担保は帰属検査(未帰属除外ゼロ)側に置く

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-17T23:06:00Z — #3181 実装形3案・#2415 除外集合3面・provenance 引用の扱い・FD jump 判断 → いずれも application-design へ(requirements.md 未解決事項節に明記)
