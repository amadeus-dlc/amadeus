<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T05:25:00Z — 設計質問は0問様式(委譲2点=骨格識別・マーカー様式はいずれも既存慣行への接地で一意の執行判断、c5 準拠)。E-OC1 判定と根拠は questions ファイル冒頭に固定
- 2026-08-10T05:25:10Z — ADR-2 に引用元マーカー(amadeus-issue-form)との意味論相違(fail-open vs 検査切替)を意図的相違として明文照合した(citation-semantics-check 準拠)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-10T05:50:00Z — 【違反実例・是正済み】ADR-2 の引用「issue-labels.yml がマーカーを parse」は誤り(grep 0 hit 実測 — 実消費者はテンプレ4本+t426 契約テスト)。mechanism-cite-verify-at-draft / citation-semantics-check の違反実例。§12a reviewer i1 は「照合済み」と主張したが実照合されていなかった — §13 選挙 E-GFR-ADS13 の subagent-1 反証で検出、conductor 独立照合で確定、decisions.md / components.md を是正。ユーザー tie 裁定 choice:1(0件 — 新規 persist なし、本記録で閉包)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
