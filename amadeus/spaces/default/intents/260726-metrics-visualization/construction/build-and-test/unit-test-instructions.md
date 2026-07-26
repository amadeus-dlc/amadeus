# Unit Test Instructions — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 実行

```bash
bun test tests/unit/t298-metrics-visualize.test.ts
```

## 対象(requirements.md FR-7 / AC 対応)

純関数27テスト: parseArgs(write/check/usage)・numericValue(非有限値の null 化)・formatValue・svgLinePath(null 分断・単点・平坦・全null)・escapeHtml(5文字)・renderHtml(全コレクタ・SHA title・self-contained・決定性・欠測)・regressionClass(両側+prev不問+未知キー)・MAX_HTML_BYTES(導出式+serializeSnapshot 16_384 ピン)
