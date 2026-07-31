# Security Test Instructions — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 各 unit の変更面からセキュリティ関連境界の有無を棚卸しした。code-summary.md — 変更ファイル一覧を攻撃面評価の入力とした。

## 検査の比例選定(c1-doctor-seam / bt-proportional-selection 準拠)

本 intent の4 unit に承認済みセキュリティ NFR・認可境界・外部入力面の変更はない。

- fix-1811 / fix-1800 / fix-1797: テストファイルのみ(本番コード非接触)。fix-1811 のプロセス kill は fixture が自ら spawn した PID に限定(collectSupervisorPids の run-record 由来 PID のみ、SIGTERM 先行)。
- fix-1816: 表示層の status 導出のみ — 認可・provenance 検証(mirror close の ownership 検査)は無改変(FR-4c、t361 契約固定を維持)。

よって DAST・依存監査の機械追加は行わない。既存 CI の必須検査(typecheck/lint/dist ガード)は全 green。

## 対象変更のセキュリティ回帰

- mirror close の provenance 検証経路: t361 無改変 green(PR #1823 CI)— close 順序・状態機械不変を §12a レビューでも確認済み。
- リポジトリ全体の依存監査は本 intent スコープ外(dependency 変更ゼロ、bun.lock 非接触)。
