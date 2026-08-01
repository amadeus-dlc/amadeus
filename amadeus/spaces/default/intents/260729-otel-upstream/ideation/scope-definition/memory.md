<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-29T06:02:35Z — Q2-A（Phase 5 を Could）と #1672 完了条件（Metrics/Logs 出力を含む）の関係を「MoSCoW は優先順位であって除外ではない」と解釈。完了条件は全 Phase 完了時の判定基準として維持
- 2026-07-29T06:02:35Z — proto-Unit B-02〜B-04（Phase 2 内）は相互独立に切れる見込みと判断したが、reader-first 順序（TC-4）は実装順序の制約として残す旨を backlog 備考に明記

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-29T06:02:35Z — 設問数を Standard 目安の下限寄り5問に絞った。#1672 に採用方針・非目標・実装順が確定済みで、確認すべき論点が境界・優先度・順序・粒度に限定されるため

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-29T06:02:35Z — Q2 で「全 Phase Must」（B案）を採らなかった。Phase 1 が hard gate で不合格撤回の可能性がある以上、後続 Phase を Must とすると撤回時に scope 未完の扱いが曖昧になるため
- 2026-07-29T06:02:35Z — Q5 で「Phase をそのまま Unit」（B案）を採らなかった。Phase 間が直列依存のため粗粒度では swarm の並行実益が出ず、Phase 内 module 分割のみが実効ある並行化単位となるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-29T06:02:35Z — B-02〜B-04 の独立性は見込みであり、units-generation で依存グラフを人が確認する（project.md ## Way of Working c4-2 の方針どおり）
