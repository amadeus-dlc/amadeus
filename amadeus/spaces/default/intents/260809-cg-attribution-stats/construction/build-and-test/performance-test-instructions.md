# Performance Test Instructions

## Upstream coverageと対象NFR

U-04の`code-generation-plan.md`と`code-summary.md`、NFR-2/4/5を入力にする。時間上限を新設せず、現行規模以上を1 processで正しく完走し、stdoutが65,536 bytes境界で切れないことをload-bearing基準にする。

## 実行コマンド

```bash
bun test tests/integration/t487-stage-stats.integration.test.ts \
  --test-name-pattern "229 shards and 136,011 rows fully drain"
```

test runnerがname filterを利用できない場合はintegration file全体を実行する。fixtureは229 shards、136,011 rows、3,000 windowsを機械assertし、Markdown/CSV/JSONを同一process pipelineで生成する。

## 合格基準

- 各format `bytes > 65,536`。
- full producerとpipe consumerがともにexit 0。
- full captureとpipe captureのSHA-256 digestが一致。
- JSONは`JSON.parse`と`jq empty`に成功する。
- filesystem順や反復実行でsemantic outputが変化しない。
