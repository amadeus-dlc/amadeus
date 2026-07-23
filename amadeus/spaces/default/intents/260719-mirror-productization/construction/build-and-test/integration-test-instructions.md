# Integration Test Instructions

## 対象と環境

U1〜U4 の `code-generation-plan.md` / `code-summary.md` に記載された filesystem、CLI、harness projection、engine/state/config境界を検証する。実ネットワークには依存せず、一時ディレクトリとfake GitHub runnerを使う。

## 実行

```bash
bun test tests/integration/t232-amadeus-mirror.integration.test.ts tests/integration/t257-amadeus-mirror-config.integration.test.ts tests/integration/t258-amadeus-mirror-skill.integration.test.ts tests/integration/t265-engine-boundary.integration.test.ts
bun test tests/e2e/t258-amadeus-mirror-skill-distribution.test.ts tests/e2e/t265-engine-boundary.test.ts
```

3 phase×4象限、pending再開、複数pending、ask相関、stdout単一JSON、stderr分離、6 harness配布一致を確認する。

## 合格基準

全テスト成功、fixture外のファイル変更0、失敗時のstate byte不変、completed後の通常routing復帰を必須とする。
