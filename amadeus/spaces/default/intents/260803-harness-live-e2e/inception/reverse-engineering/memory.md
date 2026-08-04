<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T09:44:49Z — 共有CodeKBはIssue #1717のobserved断面を現在へ昇格し、旧registry drift guard断面を履歴として保全した; 9共有成果物はrepo単位のlast-writer-wins derived cacheであるため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T10:20:14Z — preflightの系譜方向を一度誤読した後、`origin/main`へfast-forwardして全成果物を最終observedへ再接地した; `HEAD...origin/main`の左右件数と`merge-base --is-ancestor`を両方向で再実測し、追加4コミットがlive E2E焦点面を変更しないことも確認した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T09:44:49Z — 共通化対象をpolicy/lifecycle/result vocabularyに限定し、credential strategyとtransport制御をadapterへ残した; CLI/SDK/TUI/ACP/CDPを単一spawn wrapperへ統合すると共通層が条件分岐の集積になるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-03T09:44:49Z — Claude TUIの暗黙`AMADEUS_TUI_LIVE=1`と明示opt-in契約の整合、Cursor/OpenCodeのruntime capability、共通seamとrun ledgerの配置は未確定; Requirements AnalysisとApplication Designで裁定する
