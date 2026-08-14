# 統合テスト手順

## 目的と入力

`code-generation-plan.md` のゲート要件と `code-summary.md` の配送面を入力として、実 dispatcher、監査、blocking gate を通る end-to-end の拒否・許容経路を検証する。

## 実行手順

リポジトリルートで次を実行する。

`bun test tests/integration/t511-blocking-sensor-gate.integration.test.ts tests/integration/t2974-error-arm-boundary.integration.test.ts tests/integration/t92.test.ts`

## 合格条件

- 全テストが成功する。
- exit 2 と bad JSON の blocking sensor は approve/advance/finalize/complete を拒否し、sensor id と診断 Note を示す。
- exit 127 の `tool-unavailable` は従来どおり許容する。
- sensor の既存 error arm と pair-closure 回帰が成功する。
