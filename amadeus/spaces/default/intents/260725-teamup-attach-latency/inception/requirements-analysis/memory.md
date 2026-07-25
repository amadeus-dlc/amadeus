<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T08:52Z — Q1 はユーザー直接裁定で A(適用可否ガードの移植)を採用。決め手は「agmsg spawn.sh:565-568 の既存パターンの移植であり新規機構を発明しない」点と「#1476 で actas 移行した時点でガードが自動的に再有効化され検証ロジックの再実装が不要」な点。B(完全削除)は #1476 での再実装コストを生み、C(mux_attach 後ろへ移動)は無意味な180秒の背後実行と常時 exit 1 を残すため不採用。
- 2026-07-25T08:52Z — Q2(worktree 並列化)は分離。並列 `git worktree add` は `.git` 設定ロック競合の安全性検証を要し、本 intent の変更の性質(常に失敗するゲートの無効化)と異なるため。
- 2026-07-25T09:20Z — FR-4 の「既定構成で exit 0」は現行 exit 1 からの**挙動変更**だが、現行の 1 は「常に失敗するゲート」由来の偽の失敗信号であり、仕様変更ではなく文書化済み意図への回復と解釈した(検証を実行しないなら検証由来の非ゼロは発生しない)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T09:07Z — 宣言センサー3種の初回発火で upstream-coverage と answer-evidence が questions ファイルで FAILED。(a) 上流入力ヘッダ不在 → consumes 全数の実参照を冒頭へ追加、(b) 承認行の日付が ISO 形式でなく `unparseable-timestamp` → `2026-07-25T08:52Z` 形式へ是正。再発火で SENSOR_FAILED 増分 0 を確認。
- 2026-07-25T09:10Z — 別セッションのエージェントにより本 intent が requirements-analysis で park された(2026-07-25T09:10:44Z)。成果物・diary の欠落なしを実測確認のうえ unpark して再開。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T08:52Z — FR-5 で検証ロジック本体(約120行)を存置する判断は、到達不能コードを一時的に残すコストと、#1476 での再実装コストのトレードオフ。後者を重く見て存置を選んだ。ガードが「なぜ実行しないか」を stderr で表明する(FR-2)ため、検証劇場(黙って通す)には当たらない。
- 2026-07-25T09:25Z — ソロモード(`AMADEUS_OPERATING_MODE` 未設定)のため選挙・クロスレビュー2名は非適用。独立検証は §12a reviewer subagent と、RE 段の Developer→Architect 直列2段で担保した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T09:30Z — code-generation を本線 main で直接行うか Bolt worktree を切るかは未決。別セッションのエージェントが同じ record を触っている実測があるため、worktree 隔離を選ぶ理由がある。
