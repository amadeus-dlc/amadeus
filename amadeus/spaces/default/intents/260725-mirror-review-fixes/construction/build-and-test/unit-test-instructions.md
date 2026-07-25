# Unitテスト手順

## 対象とセットアップ

[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) のFR-1〜FR-6と、[code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) のRed/Green証跡を検証する。Bun標準テストランナーを使用し、各テストが独立したfixture、temporary directory、注入portを所有する。

## 実行コマンド

```bash
bun test \
  tests/unit/t232-amadeus-mirror.test.ts \
  tests/unit/t257-amadeus-mirror-config.test.ts \
  tests/unit/t268-amadeus-mirror-policy.test.ts \
  tests/unit/t274-amadeus-mirror-state-codec.test.ts \
  tests/unit/t280-amadeus-mirror-coordinator.test.ts \
  tests/unit/t281-amadeus-mirror-presentation.test.ts
```

## 要件別の期待結果

- FR-1: completedだけが成功扱いになり、未完了outcomeを区別できる。
- FR-2: binding一致、approve/skip対称性、消費済みbinding拒否を検証する。
- FR-3: legacy mutationの`--instance`必須化とlifecycleへの一対一委譲を検証する。
- FR-4: Cursor/OpenCodeのself、dist、temp packageを正準sourceへ写像する。
- FR-5: path差し替え、device/inode不一致、symlinkをfail-closedにする。
- FR-6: raw U+0000〜U+001Fを拒否し、有効なescapeを受理する。

数値coverageの新規閾値は置かない。各欠陥の正常系、異常系、副作用なし、冪等性が要件へ直接追跡できることを品質条件とする。
