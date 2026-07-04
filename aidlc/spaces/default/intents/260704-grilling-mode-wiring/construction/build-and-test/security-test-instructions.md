# Security Test Instructions — 260704-grilling-mode-wiring

Test Strategy が Minimal であり、NFR にセキュリティ要求（requirements.md の非機能要求 N001〜N004 にセキュリティ項目なし）が存在しないため、専用のセキュリティテストは対象外である。
変更範囲は `../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照する。

## セキュリティ観点の確認（devsecops 視点）

- 新規スクリプト（`dev-scripts/grilling-wiring.ts`、`check-grilling-wiring.ts`、eval）はネットワークアクセス、環境変数の秘匿情報、外部入力の実行を行わない。ファイル読み取りは repo 内の固定パターンに限定されている。
- fixture eval は `mkdtempSync` の一時ディレクトリのみに書き込み、成功時も失敗時も片付ける。
- skill markdown の変更は指示文書であり、実行可能コードを含まない。

## 対象外の判断根拠

攻撃面（ネットワーク、認証、外部入力の解釈）が変更範囲に存在しないため、SAST / DAST / injection テストは適用対象がない。
