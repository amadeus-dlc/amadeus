# performance-test instructions（260705-workspace-detect）

上流入力: [code-summary.md](../workspace-detect/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

detectWorkspace 1 関数の走査一般化であり、専用の performance-test 工程は存在しない。

## 検証

`npm run test:it:workspace-detect`（7 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件（退行確認）で担保する。
