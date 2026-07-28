<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-27T23:10:00Z — U4 FD it.1 Major: スキル検査テスト追加を UG「テスト増なし」宣言と無申告で矛盾させた → 申告付き予算改訂(+340〜540、t258 前例)で閉包。U3 it.1 Minor: stock ノードの false 分岐禁止を BLM に固定+amadeus-graph.ts:2143 の不変量コメント更新を実装タスク化。U4 it.1 Minor: 投影は manifest 一様でなく3系統(literal/helper registry/emit.ts)と明記
- 2026-07-27T22:50:00Z — U2 FD it.1 Critical: copyPluginSource の引数形を上流 C1 と2成果物で三者独立進化させた(cross-unit-type-verbatim-check 違反)→ canonical 2引数へ統一し swap を実装内契約へ。Major: --force 除去中断の状態空間漏れ → swap 方式(退避 rename)で dot-tmp へ閉包(observed-entity-from-failure-mode の失敗モード逆算)。it.2 READY
- 2026-07-27T22:20:00Z — U1 FD it.1 Major: C2 の spawn seam 確約を「migrate 同型」引用で無音降格しかけた → PluginDelegateDeps{spawn} を設計し意図的相違を申告(citation-semantics-check の「引用元の意味論と自要件の明文照合」を怠った起草ミス、reviewer が捕捉)。it.2 READY
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
