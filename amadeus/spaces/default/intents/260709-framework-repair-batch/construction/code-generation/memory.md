<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-09T07:45:00Z — bugfix スコープは units-generation スキップのため、選挙確定の 4 Bolt(fix-656-installation-detect / fix-657-sensor-tsc / fix-641-hook-project-dir / fix-661-glossary-note)を per-unit record dir として採用。construction/<bolt-slug>/code-generation/ に plan と summary を置く
- 2026-07-09T07:45:30Z — FR-656-1 の「detect は unsupported-layout を返す」は Installation union に unsupported kind がないため、「anchor-less + loose amadeus-* evidence → manual-or-unknown を返し、既存 LegacyLayout 条件(b)が UpgradeSource.fromInstallation で発火する」経路で充足する設計と解釈(要件の意図 = BR-U07 到達可能化)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-09T07:46:00Z — エンジンは bugfix スコープの code-generation を skeleton-gate ステージとして構造的に swarm 拒否する(tryEmitSwarm の isSkeletonGateStage ガード)ため、ユーザーの swarm 指示は engine 発 invoke-swarm ではなく、conductor 側の amadeus-bolt start --worktree ×4 + 並列 Task fan-out で充足する

- 2026-07-09T07:52:00Z — Deviation: amadeus-worktree/amadeus-bolt --worktree は assertNotSiblingWorktree ガードにより sibling worktree セッションから実行不能(Issue #670 起票)。Bolt は --worktree なしで状態追跡し、実装分離はハーネスの Agent worktree isolation(origin/main から bolt/<slug> ブランチを切る)で代替

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
