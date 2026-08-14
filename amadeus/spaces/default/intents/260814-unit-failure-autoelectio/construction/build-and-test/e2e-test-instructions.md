# E2E Test Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 実行方法

```bash
bun test --timeout 120000 tests/e2e/t237-election-walking-skeleton.test.ts
```

外部サービスや認証情報は不要で、一時workspace上の実CLIを使用する。

## 期待する検証範囲

- auto triggerでfailure electionをopenできる。
- split voteが`hold`となり、timelineへ記録される。
- 非収束後のacting contractが人間のRetry / Skip / Abortへ復帰する。
