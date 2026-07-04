<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-04T16:32:00Z — HUMAN_TURN の mint を手動で実行した; Cursor では PostToolUse AskUserQuestion の presence hook が発火せず、質問 widget への実回答があるのに amadeus-log answer が拒否されるため。人間が widget で回答した直後にのみ mint した。
- 2026-07-04T16:40:00Z — 学習候補の抽出を手動で行った; 本ステージの `amadeus-learnings.ts surface` が `phase: "spaces"`、`memory_entries_total: 0` を返し、FR-4 の事象がこのステージで再現された（エントリは実在する）。FR-4 修正時の再現ケースとして利用できる。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-04T16:26:30Z — workspace-detection がこのリポジトリを Greenfield と判定し reverse-engineering が SKIP された; 実際は既存コードベース（brownfield）であり、Languages/Frameworks も Unknown。本 Intent の主題（エンジン内部の突き合わせずれ）と同種の観測なので、Issue 追記の候補として記録する。
- 2026-07-04T16:26:30Z — intent-birth の --label "engine-validator-alignment" が dirName で "engine-validator-alignme" に切り詰められた; label 切り詰めの既知の弱いシームと同種の観測。
