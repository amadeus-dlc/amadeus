# security-test instructions（260705-swarm-batch-progress）

上流入力: [code-summary.md](../swarm-batch-progress/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

エンジン 1 関数の修正であり、専用の security-test 工程は存在しない。

## 検証

`npm run test:it:swarm-batch-progress`（4 検査、隔離 workspace 実 CLI）と `npm run test:all` 全件（退行確認）で担保する。
