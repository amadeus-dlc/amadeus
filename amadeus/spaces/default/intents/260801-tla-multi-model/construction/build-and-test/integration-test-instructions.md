# 統合テスト手順

`code-generation-plan.md` と5 Unit の `code-summary.md` を横断し、model-map → loader → vocabulary → runner/port → artifact verifier → CI workflow の結線を検証する。

## 重点テスト

```bash
bun test --timeout 120000 \
  tests/integration/t402-tla-module-deps.test.ts \
  tests/integration/t403-tla-loader-generalization.test.ts \
  tests/integration/t405-mirror-declaration-drift.integration.test.ts \
  tests/integration/t406-ci-all-models-measure.integration.test.ts \
  tests/integration/t380-impl-only-model-map-update.integration.test.ts \
  tests/integration/t-formal-verif-tla-model-loader.integration.test.ts \
  tests/integration/t-formal-verif-run-model-check-source.integration.test.ts \
  tests/integration/t-formal-verif-ci-model-check-artifacts.integration.test.ts \
  tests/integration/t-formal-verif-ci-model-check-runner.integration.test.ts \
  tests/integration/t-formal-verif-node-ci-model-check-port.integration.test.ts \
  tests/integration/t-formal-verif-run-model-check-diagnostic.integration.test.ts \
  tests/integration/t-formal-verif-ci-workflow.integration.test.ts \
  tests/e2e/t-formal-verif-ci-integration.test.ts
```

t406 は両モデルの実 TLA+ bytes を scratch 上で意味論変異し、production runner/port で red、bytes 復元後に各6 run green、artifact verify、最終 byte 一致を確認する。

## フル回帰と合格基準

```bash
bun run test:ci
```

- 変更対象テストは fail 0。フル CI も原則 fail 0 とする。
- 30秒を超えた既知の cold/並列 timeout は、対象ファイルを120秒で単独再実行し pass した場合だけ環境 drift と分類する。
- skip は provider/Docker 等の明示的環境 gate に限り、silent skip や未登録モデル fallback は認めない。
- 生成ツリー、workflow の permissions/timeout/trigger、FormalElection の frozen identity を不変として検査する。
