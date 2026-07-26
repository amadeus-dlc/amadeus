# Code Generation Plan — U1 visualize-skeleton

上流入力(consumes 全数): functional-design 4成果物(business-logic-model.md ほか)、component-methods.md、requirements.md

## 実施計画(実施済み — Bolt 1 コミット 9a8778ebd、PR #1500)

1. ベースライン green 実測(t230/t231 = 45 pass)→ Bolt ブランチ bolt/visualize-skeleton 作成
2. R-1: metrics-timeseries.ts へ formatValue export 昇格+numericValue 新設
3. V-1〜V-6: scripts/metrics-visualize.ts 新規(--write、fail-closed、決定的 renderHtml、inline SVG、escapeHtml)
4. T-1/T-2: t298 unit(18)+integration(13)。落ちる実証: 壊れ JSON / 空 dir / 不在 dir / dangling symlink+注入2種(null-gap 破壊・early-write)で赤→復元緑
5. 検証一式: typecheck / lint / complexity / dist:check / promote:self:check / lcov 未カバー 0(in-process seam)
