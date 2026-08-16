# Integration Test Instructions — intent 260815-priority-bug-batch-2

> Test Strategy: Comprehensive / Depth: Minimal。単一 unit(priority-bug-batch-2)構成のためユニット間相互作用はなく、対象は CLI・filesystem・選挙ストア境界の integration 層(`code-generation-plan.md` の実装が触る境界、実測値は `code-summary.md`)。

## 実行方法

```bash
bun test \
  tests/integration/t3077-election-full-retally.integration.test.ts \
  tests/integration/t246-routing-and-autonomy-guards.test.ts \
  tests/integration/t224-upstream-v2-migration-cli.test.ts
```

- 実行前に全 path の実在を機械確認する(ランナーは不存在 path を無音除外したまま成功しうる — `cid:build-and-test:test-path-set-completeness`)
- `TEST_TIME_FACTOR` は未設定でローカル既定、CI では 2

## 境界ごとの観点

| 境界 | テスト | 観点 |
|------|--------|------|
| 選挙ストア(hold→再tally→commit) | t3077 integration | 全 question を覆う再 tally が null digest で commit まで到達し、指令ループが terminal に達する |
| engine recompose ガード(state 実ファイル読取) | t246 integration | `Lifecycle Phase: CONSTRUCTION` + full 投影で拒否、IDEATION/INCEPTION では gated 実行と同一拒否理由(behavioural equivalence) |
| 監査ロック + symlink 移行 CLI | t224 | `AMADEUS_AUDIT_LOCK_RETRIES: "5"` + `scaleTestTime(15_000)` 下で 5 expects 全実行 |

## フルスイート(blocking 正本)

- リモート CI `CI Success` 集約を正とする(remote-first)。マージコミット `361e82f2` 上で success を実測済み(`build-test-results.md`)
- ローカルでの全量再実行は `bash tests/run-tests.sh --ci`(coverage 併走時は single-owner 直列化を守る)
