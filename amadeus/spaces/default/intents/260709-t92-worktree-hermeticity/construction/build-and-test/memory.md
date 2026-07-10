<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-09T15:20:00Z — 「ビルド」= dist 再生成+ドリフト検査だが、本 intent はテスト1ファイルのみで dist 非接触(dist:check / promote:self:check exit 0 で実証)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-09T15:20:00Z — codex-2 の NOT-READY(Windows 候補集合)は「ガードと本番 launcher の lockstep」という保守契約をコメントで明文化する是正に落とした — 将来 launcher 側の候補変更時にガードの追従漏れを防ぐ意図

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-09T15:20:00Z — PR #721 の CI green 待ち → leader 経由でマージ承認
