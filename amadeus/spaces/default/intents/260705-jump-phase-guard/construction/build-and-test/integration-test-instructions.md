# Integration Test Instructions（260705-jump-phase-guard）

上流入力: [code-summary.md](../jump-phase-guard/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

本 eval 自体が実 CLI の結合検証である（jump → state → audit → validator の実経路）。追加の結合試験基盤は作らない。

## 退行確認

`npm run test:it:hooks-state-bugfix`（既存 23 assertion）と `npm run test:it:engine-e2e` を含む `npm run test:all` 全件を退行確認に使う（N2）。
