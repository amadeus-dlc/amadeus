# Integration Test手順

## 上流成果物と境界

`code-generation-plan.md`と`code-summary.md`のFR-1〜FR-6を受け、live repository filesystem、Bun module import、実`bash` process、package generator境界を検証する。

## Focused integration

```bash
bun test \
  tests/integration/t416-registry-drift-guard.integration.test.ts \
  tests/integration/t65.test.ts
```

検証内容:

- CLI dispatchと`Valid:`が33件で一致
- schema、emitter、authoritative spec、英日referenceが25件で一致
- `when`がsupportedでreserved表に存在しない
- 英日対象docsが`full=true`、無関係docsが`full=false`
- 既存stage inventoryが回帰しない

## Comprehensive regression

```bash
bun test \
  tests/unit/t416-registry-drift-guard.test.ts \
  tests/integration/t416-registry-drift-guard.integration.test.ts \
  tests/unit/t209-stop-hook-state-verb-carveout.test.ts \
  tests/unit/t248-stage-contract.test.ts \
  tests/unit/t62.test.ts \
  tests/unit/t250-unit-iteration-and-scope-preview.test.ts \
  tests/unit/t258-lifecycle-transaction.test.ts \
  tests/integration/t65.test.ts
bun run test:ci
```

focused回帰の期待値は8 files、206 pass、0 fail。`test:ci`はsmoke＋unit＋integrationのrepository-native gateとして実行し、失敗時は該当fileを単独再実行してcold timeoutと実欠陥を区別する。

## E2E適用判断

専用E2Eは非適用とする。本変更は利用者向けworkflow、service、database、network、認証境界を追加せず、guardの最外境界はlive filesystem＋実shell processである。Test Strategy名だけで無関係なfull lifecycle E2Eを追加せず、repository全体の既存E2Eはrelease profileの既存責務として維持する。
