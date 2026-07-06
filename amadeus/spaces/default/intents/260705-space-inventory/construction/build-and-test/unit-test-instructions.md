# unit-test instructions（260705-space-inventory）

上流入力: [code-summary.md](../space-inventory/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

docs / memory / knowledge / codekb の整合修正であり、専用の unit-test 工程は存在しない。

## 検証

grep（廃止参照ゼロ）、`npm run parity:check`、`npm run test:all` 全件で担保する。
