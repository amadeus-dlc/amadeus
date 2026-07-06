# integration-test instructions（260705-engine-gap-trio）

上流入力: [code-summary.md](../engine-gap-trio/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

エンジンスクリプトと validator の修正であり、専用の integration-test 工程は存在しない。

## 検証

`npm run test:it:engine-gap-trio`（11 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件（退行確認）で担保する。
