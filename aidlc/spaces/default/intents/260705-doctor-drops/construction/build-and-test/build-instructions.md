# build instructions（260705-doctor-drops）

上流入力: [code-summary.md](../doctor-drops/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

doctor 1 検査節の追加であり、専用の build 工程は存在しない。

## 検証

`npm run test:it:doctor-drops`（7 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件（退行確認）で担保する。
