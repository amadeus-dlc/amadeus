# Security Test 手順 — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 適用判定

今回の変更は認証、認可、入力処理、外部通信、依存関係、シークレット、IaC を変更しない。攻撃面と trust boundary は増えないため、新規 SAST / DAST / dependency scan の追加は非適用とする。

## 代替検証

- `bunx @biomejs/biome check` で正本2ファイルの静的検査を実行する。
- `bun run typecheck` で型境界の破損がないことを確認する。
- Journal の malformed input refusal と observability の fail-closed / fail-open 契約を既存回帰テストで確認する。
- 新規依存関係、シークレット、環境変数、ネットワーク endpoint が差分に存在しないことを差分レビューで確認する。

## 再判定条件

Journal input schema、audit trust anchor、OTLP endpoint、redaction、設定ファイル読取、認証情報の扱いを変更する場合は、STRIDE と dependency / secret scan を含む security test を再設計する。
