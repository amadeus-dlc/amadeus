# Integration Test Instructions

Unit: docs-i18n（Test Strategy: Minimal）

## 検証対象と手順

文書変更が repo 全体の契約（typecheck / lint / contracts / parity / wiring / evals / engine-e2e / diff）と矛盾しないことを、repo 標準検証で確認する。

```sh
npm run test:all
```

## 結果

pass（exit 0）。詳細は [build-test-results.md](build-test-results.md) を参照する。
