<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-25T07:20:00Z — Interpretations: base は 260724-harness-provenance の observed 2d0da11d が非祖先(squash マージ)のため、祖先最小距離の 6d4df9056 を選定(rescan-base-ancestry 規則どおり)。区間 105 commits / 624 files
- 2026-07-25T07:20:00Z — Interpretations: Kimi には persona 名前解決がないため、Developer スキャンは explore(read-only 強制)、Architect 合成は write scope を codekb 配下に限定した coder で代行。ユーザーの「RE はコード改変しない」指摘で型を修正
- 2026-07-25T07:20:00Z — Tradeoffs: preflight の trunk 統合で 65 commits 取り込み(rebase)。checkpoint commit が先に必要で、org.md の既定どおり ideation 完了点で実施
- 2026-07-25T07:20:00Z — Deviations: 宣言センサー3種は codekb 出力パスと filter 不適合で構造的に不発(re-sensors-codekb-filter-mismatch)。conductor 手動検証(git status 範囲 + re-scan 記録の内容確認)で代替
- 2026-07-25T07:20:00Z — Open questions: なし。kimi touch list は code-structure/component-inventory の現行節に確定
