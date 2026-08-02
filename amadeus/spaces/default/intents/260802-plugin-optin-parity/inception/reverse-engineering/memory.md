<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T06:27:55Z — Issue #2018 を Codex 固有ではなく全ハーネス parity の欠陥として解釈した; ユーザー訂正と独立クロスレビューに基づき、7 package face／6 host directory、OpenCode manual-only、Kiro shared-host を同じ修正境界に含める。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T06:27:55Z — SessionStart から全ハーネスを一括 compose せず current host materialization を候補とした; cross-host mutation を避けつつ、プロジェクトが導入対象として記録した plugin 名を単一正本として各 face の既存 trigger 契約を保つ。
- 2026-08-02T06:27:55Z — plugin 未 opt-in の正常な 0/0 と opt-in 済み host 欠落の異常な 0/0 を分離する; 全 0/0 を stale にすると既存 zero-impact 契約と t299 を壊すため、desired／staged／recorded の三者比較を要件候補とする。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-02T06:42:38Z — rebaseで取り込んだ #2017 により layered config moduleの正規名は `amadeus-config.ts` となった; 導入対象の plugin 名をどこへ記録し、どう読むかは新しい正規 config 境界を前提に requirements で確定する。
