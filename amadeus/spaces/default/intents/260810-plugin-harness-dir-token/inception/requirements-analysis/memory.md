<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T05:35:00Z — `self-fix` は application-design を実行せず `next_stage` が `code-generation` のため、U-1（是正機構の置き場）の裁定を本ステージの明確化質問で確定させた; 設計段が独立して存在しないスコープでは要件段が最後の裁定点になる
- 2026-08-10T05:35:00Z — 受け入れ条件を「ソースがトークンになったか」ではなく「各ハーネスの実ツリーで実パスに解決したか」で書いた; 配送経路が 2 本あり、ソース断面の検査だけでは経路B の退行を見逃すため
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-10T05:35:00Z — 明確化質問を stage-protocol §3 の 4 モード提示ではなく guided 固定で提示した; self-guided の選択肢はファイル冒頭に明記して回答権は残した。Minimal depth・単発 Issue でモード選択自体の往復コストが利得を上回ると判断
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-10T05:35:00Z — Q1 で B（compose 本体に置換器）ではなく A（seeding を変換経由へ）を採った; B は射程最大だが N-7（staleness digest を置換前/後どちらで取るか）の設計判断を呼び込み `t416` の決定性テストに波及する。consumer 面は経路A で既に正しいため、壊れている self-install / dogfood 面だけを塞ぐ方が blast radius に見合う
- 2026-08-10T05:35:00Z — Q2 で兄弟 11 行の一括是正（A）ではなく Issue 起票（C）を選んだ; 機構を入れれば 12 行が同時に射程に入るのは事実だが、判定が DEDUCED のままで実測が無く、`self-fix` の「限定的な是正」という定義から外れる
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-10T05:35:00Z — FR-3 を seeding 側と compose 側のどちらの変換点で満たすかは実装時判断に委ねた; compose 側を選ぶ場合は N-7 の digest 判断が発生するため、その場合はゲートで明示申告する契約にした
- 2026-08-10T05:35:00Z — 兄弟 11 行が consumer で解決しないことは DEDUCED のまま（実 consumer ワークスペースでの実行実測なし）; 確定は FR-9 で起票する Issue 側に送った
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
