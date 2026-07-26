# Code Generation Plan — U2 visualize-hardening

上流入力(consumes 全数): functional-design 4成果物(business-logic-model.md ほか)、nfr-design、requirements.md

## 実施計画(実施済み — Bolt 2 コミット 7c9741d65+b4a5ee2bb、worktree bolt-visualize-hardening)

1. script 増分: regressionClass(固定判定表6条件)・MAX_HTML_BYTES(導出式)・--check(3値契約)・凡例行・.regressed スタイル
2. テスト: t298 追記(unit: 強調両側・prev不問・ミラー定数ピン・凡例 / integration: --check round trip・tampered・missing・over-ceiling zero-write)
3. CI: metrics-snapshot job へ Render ステップ(retention 後・commit 前、continue-on-error なし)
4. docs: 23-metrics-dashboard(.ja).md 日英ペア+README 索引+言語切替ヘッダ(t174 ゲート green)
5. 検証: typecheck / lint(main 複雑度は checkAgainstDisk 抽出で警告解消)/ complexity / dist:check / promote:self:check / lcov DA0 なし / t174
