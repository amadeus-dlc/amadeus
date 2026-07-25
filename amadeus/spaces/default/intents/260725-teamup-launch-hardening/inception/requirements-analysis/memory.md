<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T12:20Z — B-4(exit code の意味づけ)は RE の発見により**争点が変わった**。mux_attach(:513-515)が open -na Ghostty の非ブロッキング1行であり :1483 の後も :1484-1496 が走って :1497 の exit に到達するため、検証を後ろへ移しても exit code は保たれる。:1473-1476 のコメント「an interactive attach would swallow it」は現行実装で不成立。真の争点は「attach 後にスクリプトが最大どれだけ生存してよいか」= 呼出元シェルのプロンプト復帰時刻へ移り、Q1 裁定 A(タイムアウトを実測32.2秒へ接地)で解決した。
- 2026-07-25T12:20Z — FR-2 は architecture.md の指摘(CLAUDE_MONITOR_PROMPT は :104 のハード定数で env 上書き不能、:102-103 が宣言する「単一ソース」不変条件は actas 化で role を含むと単一定数では保てない)を受け、「単一の導出関数(role → prompt)へ形を変える」を要件化した。construction.md の canonical 1定義原則の適用。
- 2026-07-25T12:20Z — Q2(ロールバック)は worktree 実在走査で再導出する案を採用。子→親の状態共有機構を新設せずに済み(org.md Forbidden の要求外機構の追加を避ける)、台帳と実体の乖離という失敗様式自体を消せる。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T12:25Z — 引用の機械的総当たり照合で off-by-one を1件自己捕捉した。clear_stale_watcher_sentinels のガードは :1460-1462 ではなく :1461-1463(:1460 はコメント行)。reviewer 前に是正済み。
- 2026-07-25T12:20Z — requirements の全行番号を現 HEAD で再解決した。上流 ideation 成果物(intent-statement / scope-document)には PR #1477 前の行番号が残っているが、承認済み成果物のため遡及修正せず、requirements 側で再解決する方針を本文冒頭に明記した(cid:reverse-engineering:upstream-cite-reresolve-on-shift)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T12:20Z — WATCHER_RESEND_MAX(現 1)は変更しないことを NFR-2 で明示した。#1384 の prompt 脱落回復に最低1回の再送が要るという前 intent の裁定(E-WTFRA1 の留保 FR-1)を維持するため。縮めるのは WATCHER_READY_TIMEOUT のみ。
- 2026-07-25T12:20Z — NFR-3(actas 排他ロックの検証)は「実装時に実測する」という形で要件化した。feasibility では1メンバーのプローブしか行っておらず、7メンバー同時起動と resume でのロック競合は未観測のため。要件から落とすと未検証のまま出荷される。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T12:25Z — なし。Q1/Q2 ともユーザー直接裁定で確定。NFR-3 の未検証事項は要件として明示的に持ち込んだ。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
