# CI Pipeline Questions

## 入力成果物

この質問票は、各 Unit の `code-summary`、`build-and-test-summary`、`build-test-results` を入力として作成した。

## Questions and Answers

### Q1. What CI tool is in use?

[Answer]: GitHub Actions を使う。

根拠は `.github/workflows/ci.yaml` である。

### Q2. What is the branch strategy?

[Answer]: GitHub Flow に近い短命ブランチと PR を使う。

PR merge は人間が実行する。

自動 merge は CI pipeline の対象外にする。

### Q3. What quality gates are required before merge?

[Answer]: `npm run test:all` を必須 gate とする。

`test:all` は `typecheck`、`lint:check`、`contracts:check`、`parity:check`、`claude-wiring:check`、`test:it:all`、`test:it:engine-e2e`、`diff:check` を含む。

現在は `parity:check` が 8 件の hash 不一致で失敗するため、merge-ready ではない。

### Q4. What artifact repositories are used?

[Answer]: この Intent では artifact repository を使わない。

変更対象は Amadeus の local tooling、hook、eval、Amadeus DLC 成果物である。

Docker image、package publish、S3 artifact は生成しない。

## Open Items

Parity failure の解決方針は未確定である。

解決候補は、配布基準の更新、upstream contribution path、人間承認付き exception のいずれかである。
