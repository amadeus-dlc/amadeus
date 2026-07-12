# 統合テスト手順

## 対象と上流追跡

各 `code-generation-plan.md` と `code-summary.md` でunitから分離したFS/process境界を実環境に近い一時fixtureで検証する。

- U1: 非coverage runnerと `coverage/tests-totals.json`、SUMMARYの一致。
- U2: atomic writer、衝突非上書き、実collector、`--write`/`--check`。
- U3: repository workflow読込、bare remoteでのNFF retry成功、rebase conflictのloud-fail。

## 実行方法

```sh
bun tests/run-tests.ts --integration --filter 't220-run-tests-totals|t221-metrics-snapshot|t222-ci-snapshot'
bash tests/run-tests.sh --ci
```

fixtureは一時directoryとローカルbare repositoryのみを使い、実remoteへpushしない。AWS資格情報が無効な環境ではrunner表示どおりlive SDK/substrate testsをskipする。

## 合格基準

- 対象integrationが全件passすること。
- 実collectorの各CLI testが10秒未満で完了すること。
- 正準full CIがexit 0で、失敗file/assertionが0であること。
