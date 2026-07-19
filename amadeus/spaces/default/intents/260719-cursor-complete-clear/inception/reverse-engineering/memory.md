<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- [2026-07-19T14:38Z] Interpretation: diff-refresh base は rescan-base-ancestry に従い全 re-scans の observed から HEAD 祖先・距離最小の `591b6a2a2`(距離52)を採用。直近3つの observed(c2e4975ff/594ba21d/e9a001105)は本 run worktree の HEAD に対し全て非祖先(squash 並行 tip)で除外 — 既存ノルムの適用実例。
- [2026-07-19T14:38Z] Interpretation: RE 宣言センサー3種は codekb 出力の filter 構造不適合で常に matches-rejection(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)につき、成果物検証は conductor 手動確認で実施(produces 9+per-intent 実在・最新バナー1件・マーカー0 を機械確認)。
- [2026-07-19T14:38Z] Tradeoff: body 更新は architecture.md 1箇所に集約し7成果物温存(churn 回避 c1)。新規知識は set⇔clear 非対称+status ゲート不在の構造的事実1点のため。
- [2026-07-19T14:38Z] Open question: 修正方式(complete 時カーソル clear / hook・audit 側 status ゲート / 両方)は未決 — requirements で選挙依頼(leader 指令 14:28Z (4)、単独決定禁止)。
