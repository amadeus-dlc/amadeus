# integration-test instructions（260705-rulesdir-resolve）

上流入力: [code-summary.md](../rulesdir-resolve/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

graph compile のパス解決修正であり、専用の integration-test 工程は存在しない。

## 検証

`npm run test:it:rulesdir-resolve`（6 検査、実体パス実 CLI）と `npm run test:all` 全件で担保する。
