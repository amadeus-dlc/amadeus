# Code Generation Plan — issue-2834-consume-fanout

## 方針

U2は、per-unit producerの確定Unit集合を7つの非per-unit consumerへ渡し、`consumes: string[]` を Unit×artifact の安定した直積へ展開する。成功Unitのみを母集団とし、cancelled・failed・pending・集合不確定・読取失敗はpartial directiveを返さずfail-closedにする。正当なskeleton / `--single` placeholder免除は維持する。

## 実装チェックリスト

- [x] producer成果物とOutcomeProjectionをUnit slugで照合し、succeeded populationを構築する。
- [x] build-and-test、ci-pipeline、performance-validation、observability-setup、incident-response、deployment-pipeline、environment-provisioningの全consumerを同じresolver経路で処理する。
- [x] Unit×artifact fan-out、stable ordering、dedupe、presence split、reviewer read scopeを実装する。
- [x] `{unit-name}` の限定解決と、解決不能時のerror directive/cursor unchangedを実装する。
- [x] malformed JSON、ENOENT/ELOOP、空母集団、inventory driftをfail-closedで検証する。
- [x] PR #2865を作成し、patch coverage・full Tests・レビュー収束を完了する。

## 完了証拠

requirements FR-DIR-1〜5、FR-REVIEW-1、7 consumer/19 edge inventory、placeholder互換契約を、resolver/fan-out実装とt533 focused testsおよびPR CIで検証した。U1のoutcome projection実装をimportせず、公開projection入力との境界を維持した。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T22:26:43Z
- **Iteration:** 1
- **Scope decision:** none

実装計画・コード要約・PR収束記録は要件とステージ契約を満たしており、未解決のBLOCKERはありません。

### Findings

- None
