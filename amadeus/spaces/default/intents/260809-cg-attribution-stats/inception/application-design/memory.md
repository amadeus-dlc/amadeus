<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-08-09T14:55:13Z — 本stageの「service」は既存one-shot Bun CLIのみを指す。AWS、network、database、UIのsupport perspectiveは、追加基盤が不要でread-only process境界を維持すべきことの確認に用いた。
2026-08-09T14:55:13Z — measured populationは既存raw record列のまま、attributionだけをdedup済みreadonly viewへ分岐する。Issue #2695の全完了条件はこの分離の上でC-01〜C-06へownerを割り当てた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-08-09T14:55:13Z — prior requirementsとBrownfield CodeKBで実行形・互換境界・禁止事項が確定済みだったため、質問はmodule boundaryの1問に限定した。質問省略によるscope縮小はなく、未質問事項は出典付き設計契約として反映した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-08-09T14:55:13Z — 既存約1,000行のCLIを互換façadeとして維持し、domain/candidates/intervals/reportをpure moduleへ分離した。import/type数は増えるが、変更理由、PBT seam、既存consumer互換を守れる。
2026-08-09T14:55:13Z — C-01を唯一のorchestratorにし、C-04がcandidate単位のpost-accounting dispositionを返す設計にした。C-03/C-04/C-05の責任境界を増やす代わりに、`empty-after-idle`の一意計数とtyped fail-closed経路を実装可能にした。
2026-08-09T15:03:34Z — 複数windowでcandidate dispositionが重複しないよう、C-04をwindow単位呼出しからpopulation単位の単一呼出しへ修正した。candidateは1 dispositionを持ち、`accounted`の場合だけ1件以上のwindow contributionを持つため、複数windowへの正当な寄与とprimary rejectionの一意性を両立する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-08-09T14:55:13Z — なし。識別子の微修正は後続Functional Designで許容するが、責務、依存方向、closed vocabulary、error category、measured/attribution分岐境界は固定する。
