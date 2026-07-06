# unit-test instructions（260705-engine-error-logged）

上流入力: [code-summary.md](../engine-error-logged/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

エンジン 1 関数の追加であり、専用の unit-test 工程は存在しない。

## 検証

`npm run test:it:engine-error-logged`（8 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件で担保する。
