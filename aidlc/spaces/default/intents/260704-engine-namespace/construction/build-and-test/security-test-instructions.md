# Security Test Instructions — 260704-engine-namespace

Test Strategy が Minimal であり、セキュリティ NFR が存在しない（requirements.md の N001〜N005 にセキュリティ項目なし）ため、専用のセキュリティテストは対象外である。
変更範囲は `../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照する。

## セキュリティ観点の確認

- 変更は既存ファイルの改名と参照文字列の更新であり、新しい攻撃面（ネットワーク、認証、外部入力の解釈）を追加しない。
- `.claude/settings.json` の `permissions.allow` は旧パスから新パスへの置換のみで、許可範囲は拡大していない。
- parity-check の拡張はローカルファイルの読み取りに限定され、実行や外部送信を行わない。

## 対象外の判断根拠

攻撃面の変更が存在しないため、SAST / DAST / injection テストは適用対象がない。
