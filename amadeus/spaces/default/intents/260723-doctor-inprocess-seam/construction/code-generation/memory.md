<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-23T06:06:36Z — process-global 依存の除去は公開関数だけでなく配下 helper の call tree 全体を対象にする; resolver 後に env・platform・時刻を変えても同じ context の結果が不変であることを検証する

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-23T06:06:36Z — filesystem/process を使う medium test は unit allowlist を増やさず integration suite に置く; test-size classification ratchet を設計上の配置根拠とする

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-23T06:06:36Z — 並列負荷下の child watcher は固定回数 polling や本番 injection ではなく READY/START handshake と期限付き kill/reap を使う; 起動遅延と孤児 process の両方を制御できる

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
