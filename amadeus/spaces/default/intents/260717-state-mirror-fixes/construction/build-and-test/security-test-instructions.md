# Security Test Instructions — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## 選定(build-and-test:c3 — 攻撃面の実測明記)

専用セキュリティテストは**追加しない** — 反証可能根拠: 両 diff に新規入力面・新規ファイルパス・shell 実行・ネットワーク I/O・認証情報の混入なし(code-generation の reviewer が grep 機械確認済み — security-design のレビュー観点を実施)。既存必須 scan(CI の lint/typecheck)は不変で省略していない(c3)。

## 実施済みの検査

- U1: advisory 文言は固定テンプレート(stage 名+checkbox 状態のみ)— 任意文字列 echo なし(reviewer 実読)
- U2: 正規表現は固定リテラル・ReDoS 構造なし(reviewer 実測)
