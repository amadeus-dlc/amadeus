# Unit Test Instructions

## 対象とセットアップ

`code-generation-plan.md` のFR-1〜FR-10と `code-summary.md` の実装対応を、codec、digest、authorization、audit vocabularyの単位で検証する。追加サービスや共有fixtureは使わず、各testが一時directoryを所有する。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/unit/t427-goal-reconciliation.test.ts \
  tests/unit/t115.test.ts \
  tests/unit/t17.test.ts \
  tests/unit/t28-audit-event-sync.test.ts \
  tests/unit/t81.test.ts
```

## 合格条件とcoverage

- Goal lineage / receiptのparse→serialize→digestが決定的である。
- missing、tampered、stale、cross-Intent、unknown verdictをfail-closedにする。
- `ACHIEVED`以外からcompletion authorizationを得られない。
- coverage ratchetを低下させず、全assertionが成功する。数値達成のための無意味なtest追加は行わない。
