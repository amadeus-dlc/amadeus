# Integration Test Instructions

Unit: readme-refresh（Test Strategy: Minimal）

## 検証対象と手順

README の記載が repo 全体の契約（parity、wiring、contracts、evals、engine e2e）と矛盾しないことを、repo 標準検証で確認する。

```sh
npm run test:all
```

## 結果

pass（exit 0）。詳細は [build-test-results.md](build-test-results.md) を参照する。
