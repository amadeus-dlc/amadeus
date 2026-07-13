# 性能テスト手順

## 適用範囲と上流追跡

`code-generation-plan.md` と `code-summary.md`、U2のperformance designが定義するローカルCLI 10秒以内と、U3のGitHub Actions job 5分timeoutを検証する。サービス型load testは本featureにHTTP/APIや常駐processがないため非適用である。

## 実行方法

```sh
bun tests/run-tests.ts --integration --filter t221-metrics-snapshot
bun tests/run-tests.ts --unit --filter t222-ci-snapshot-wiring
```

実collectorの `--write` と `--check` は各testの10,000ms timeoutで上限を固定する。workflowは `timeout-minutes: 5` とPRクリティカルパス非包含を静的契約で確認する。

## 合格基準

- U2 integration 5件がpassし、実collector実行が10秒上限を超えないこと。
- U3 wiringの5分timeout、main push guard、`ci-success`非依存がpassすること。
- 外部GitHub runnerの実所要時間、queue 100件上限、landing後のmain実行確認は運用観測へ引き継ぐ。
