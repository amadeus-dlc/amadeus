# Units Generation Memory

## Interpretations

- 2026-07-07T07:24:00Z — Units Generation は implementation order ではなく dependency DAG を作る stage として扱い、順序や critical path は Delivery Planning に残した。
- 2026-07-07T07:24:00Z — 初期 unit は directory move ではなく ADR/設計記録、docs、validation、follow-up issue に分解した。その後ユーザー指示により `core` / `harness` の実移動を同じ PR に追加した。
- 2026-07-07T07:24:00Z — User Stories stage は skip されているため、story map は requirements と design decisions への mapping として作成した。

## Deviations

- 2026-07-07T07:24:00Z — Decomposition questions と plan approval は追加で聞かず、Application Design で承認済みの境界をそのまま unit DAG に変換した。

## Tradeoffs

- 2026-07-07T07:24:00Z — source root abstraction は optional follow-up ではなく、`scripts/package.ts` の `CORE_ROOT` / `HARNESS_ROOT` を `packages/framework/` に向ける最小実装として扱う。

## Open questions

- 2026-07-07T07:24:00Z — Delivery Planning で、ADR と docs を同一 Bolt にするか分けるかを決める。
