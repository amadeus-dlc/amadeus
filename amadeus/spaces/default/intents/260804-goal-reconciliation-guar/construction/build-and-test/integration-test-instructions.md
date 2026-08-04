# Integration Test Instructions

## 対象境界

`code-generation-plan.md` と `code-summary.md` が定義する Goal revision authority、全terminal path、legacy migration、mirror ordering、crash recoveryを、実processとfile persistenceを含めて検証する。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/integration/t427-goal-reconciliation-completion.integration.test.ts \
  tests/integration/t428-goal-revision-authority.integration.test.ts \
  tests/integration/t429-legacy-goal-migration.integration.test.ts \
  tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts \
  tests/integration/t247-runtime-recovery.test.ts \
  tests/integration/event-registry-drift.test.ts
```

全repository回帰は `bun run test:ci` で実行する。

## 合格条件とtest data

- gated / non-gated report、direct completion、finalize、recoveryの全経路が同じreceipt preconditionを通る。
- Goal guard拒否時にstate、audit、registry、cursor、mirror外部作用が部分確定しない。
- test dataは各caseが専用temporary workspaceへ生成し、他testと共有しない。
- 全test fileと全assertionが成功し、失敗・skipは結果報告に明記する。
