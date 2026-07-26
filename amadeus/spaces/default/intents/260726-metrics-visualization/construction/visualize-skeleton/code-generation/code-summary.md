# Code Summary — U1 visualize-skeleton

上流入力(consumes 全数): functional-design 4成果物、component-methods.md、requirements.md

## 変更ファイル(Bolt 1、コミット 9a8778ebd / PR #1500)

| ファイル | 種別 | 内容 |
|---|---|---|
| scripts/metrics-visualize.ts | 新規(217行) | --write CLI+決定的 renderHtml(inline SVG・値表・SHA title)+fail-closed |
| scripts/metrics-timeseries.ts | +14行 | formatValue export 昇格+numericValue 新設(AC-1c 不変 — t298 契約 grep で機械検査) |
| tests/unit/t298-metrics-visualize.test.ts | 新規(119行) | 純関数18テスト(決定性・self-contained・SHA・欠測) |
| tests/integration/t298-metrics-visualize.integration.test.ts | 新規(180行) | CLI+fs 13テスト(spawn+in-process 二重駆動、実データ sweep 6コレクタ) |
| metrics/index.html | 生成物(546,279 bytes) | 123 snapshots・6コレクタ(コミット対象 — Q1=A) |

## 検証結果(全実測 exit 0)

- bun test t298 系: 31 pass / t221/t230/t231: 68 pass(無退行)
- typecheck / complexity-gate --check / dist:check / promote:self:check: 全て exit 0
- lcov: metrics-visualize.ts DA:0 なし(in-process seam)
- 生成物再実行 byte 一致(決定性実証)
- §12a reviewer: it.1 REVISE(svgLinePath 無申告逸脱)→ 契約準拠是正 → it.2 READY
- walking-skeleton ゲート: ユーザー実物確認のうえ承認(2026-07-26、自律継続選択)
