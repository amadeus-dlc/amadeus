上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Unit / Smoke Test 手順

## 適用範囲

- active Test Strategy は Comprehensive。
- U1〜U3 に新規 executable behavior はないため、新規unit testは作らない。既存classifier、metrics collector、runnerの回帰を再利用する。
- [#1193](https://github.com/amadeus-dlc/amadeus/pull/1193) の2軸契約に従い、in-process駆動は計測方法、unit/integrationは配置責務として別に扱う。実FS・subprocess境界の新規ケースはintegrationへ置く。

## フレームワークと設定

- Bun 1.3.13の既存test runnerを使い、新規依存・test config・global fixtureは追加しない。
- current回帰はrepository rootでserial実行し、U1/U3のexact-ref検証は `3917a283a953165866170d235d3dc25ad2fd3643` のrepo外export内で実行する。
- smoke/unitのtier選択とfilterは `tests/run-tests.ts` の既存CLI契約を使い、独自の対象列挙を作らない。

## 実行コマンド

現在の worktree の構造検査とunit tierをserialで実行する。

```bash
bun tests/run-tests.ts --smoke
bun tests/run-tests.ts --unit
```

U1/U3 の exact ref 検証では、後述の integration 1件と合わせて次の4 unit filesを実行する。

```bash
bun test \
  tests/unit/t-test-size-drift.test.ts \
  tests/unit/t221-metrics-snapshot-core.test.ts \
  tests/unit/t221-metrics-snapshot-collectors.test.ts \
  tests/unit/t221-metrics-snapshot-cli.test.ts
```

## 期待値とcoverage

- U2の承認済み時間budgetは smoke 21秒、unit 128秒だが、subject refが異なるため本runでは強制gateにしない。wall timeを観測値としてのみ記録する。
- 全assertion成功、explicit skip 0を期待する。失敗やskipを既存baselineの値へ置換しない。
- unit tierのLCOV単独pathは未実装でPENDING。combined coverageだけを `coverage:ci` で検査する。
- U3の`classification-review` 68件が残るため、unit tier全体の配置準拠をPASSとは表現しない。

## テストデータと隔離

- 各testは自身のfixtureと一時directoryを所有し、実行順や共有mutable stateへ依存しない。
- exact-ref検証は `git archive` でrepo外へ展開し、current dirty worktreeの同名testを証拠へ代用しない。
- runnerが更新するignoredな `tests/logs/test-size-report.json` と `coverage/tests-totals.json` はversioned成果物に含めない。
