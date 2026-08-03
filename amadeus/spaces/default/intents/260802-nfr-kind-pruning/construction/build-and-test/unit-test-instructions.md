# Unit Test手順 — nfr-kind-pruning

## 参照成果物と対象

`code-generation-plan` と `code-summary` のFR-1〜FR-4、FR-6〜FR-8を対象に、共有DAG parser、kind必須sensor、5正準kindの成果物matrix、stage source contractを検証する。既存Bun test runnerを使用し、各testは独立fixtureを持つ。

## 実行コマンド

```bash
bun test --timeout 120000 \
  tests/unit/t133-bolt-dag-compile.test.ts \
  tests/unit/t248-stage-contract.test.ts
```

## 合格条件とテストデータ

失敗0件であること。test内の一時ディレクトリとinline fixtureだけを使い、共有状態や実データを使用しない。固定coverage率を目的化せず、kind欠落、不正kind、5kind matrix、legacy fallback契約に対応するassertionがすべて成功することを品質ゲートとする。
