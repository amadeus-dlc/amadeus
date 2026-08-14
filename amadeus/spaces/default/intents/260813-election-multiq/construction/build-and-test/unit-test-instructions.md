# Unit テスト手順

U1–U8 の [code-summary](../election-canonical-schema/code-generation/code-summary.md) と各 unit の code-generation-plan が固定した契約を、Bun test の unit 層で再確認する。

## 実行

```
bun test --timeout 120000 tests/unit/t547-election-codec.test.ts tests/unit/t548-election-codec.pbt.test.ts tests/unit/t549-election-question-tally.test.ts tests/unit/t550-election-question-tally.pbt.test.ts tests/unit/t551-election-record-transport-v2.test.ts tests/unit/t552-election-record-transport.pbt.test.ts
```

全 unit 層は `bun tests/run-tests.ts --unit`、CI 相当は `bun run test:ci`。

## 対象と期待

- U1 codec: t547 / t548。legacy 単問と v2 `questions[]` の decode。
- U2 tally: t550。question 単位 resolution と mixed / hold-only。
- U4 record/transport: t552。
- U7 FormalElection の live identity は filesystem を読むので integration の t557 に置く。
- 新規設定ファイルは追加しない。既存 Bun runner を使う。
