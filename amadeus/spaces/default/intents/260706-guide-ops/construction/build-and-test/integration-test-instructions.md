# Integration Test Instructions

Unit: guide-ops（Test Strategy: Minimal）

## 検証対象と手順

文書新設が repo 全体の契約と矛盾しないことを repo 標準検証で確認する。

```sh
npm run test:all
```

## 結果

pass（exit 0、ok 695 件）。前 Intent（#533 第 1 弾）で学んだ rename-leftovers の tree-wide 検査も、本 Intent の新章は `aidlc` 言及なしのため素通しで pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
