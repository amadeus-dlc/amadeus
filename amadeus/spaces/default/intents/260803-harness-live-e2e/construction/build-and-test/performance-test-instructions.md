# Performance Test Instructions

## 上流成果物と適用範囲

各 `code-generation-plan.md` / `code-summary.md` のNFRは常駐serviceのthroughputではなく、live CLI journeyの時間・byte/event/queue上限と確実なreapを要求する。そのためload testは非適用とし、bounded collector、deadline、overflow後discard-drainを決定的fixtureで検証する。

## 実行方法

```bash
bun test \
  tests/unit/t-live-e2e-hardening-kit.test.ts \
  tests/integration/t-live-e2e-lifecycle.integration.test.ts \
  tests/integration/t-live-e2e-claude-print.integration.test.ts \
  tests/integration/t-live-e2e-claude-sdk.integration.test.ts \
  tests/integration/t-live-e2e-claude-tui.integration.test.ts
```

## 合格基準

- injected短時間deadlineでtimeoutが決定的に終端する
- stdout/stderr、SDK event、pane captureの上限超過がgreen receiptを生成しない
- overflow後もprocess/worker/tmux serverをreapし、credential/scratchを残さない
- test自体に長い固定sleepや実provider latency依存がない

## 実live計測

実CLI/modelのwall-clockは環境・課金・credential依存のため通常CIでは測定しない。明示opt-inで実行した場合だけsanitized receiptの時刻・version・digestをledgerへ残し、raw outputは保持しない。
