# security-test instructions（260705-pdm-scope）

上流入力: [code-summary.md](../pdm-scope/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

scope 定義（データ + 定義ファイル + 参照面）の追加であり、専用の security-test 工程は存在しない。

## 検証

`npm run test:it:pdm-scope`（8 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件（parity / promote / contracts を含む退行確認）で担保する。
